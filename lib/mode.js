var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    git = require('git'),
    cli = require('cli'),
    sh = require('sh'),
    CallQueue = require('queue').CallQueue;

// ---------------------------------------------------------------------------
// public module properties

var _baseDir;
exports.__defineGetter__('baseDir', function(){
  return _baseDir;
});
exports.__defineSetter__('baseDir', function(v){
  _baseDir = v;
  // update git.dir
  git.dir = _baseDir;
});
exports.baseDir = path.dirname(__dirname);

exports.__defineGetter__('indexDir', function(){
  return path.join(exports.baseDir, 'index');
});
exports.__defineGetter__('cacheDir', function(){
  return path.join(exports.baseDir, 'cache');
});
exports.__defineGetter__('libDir', function(){
  return path.join(exports.baseDir, 'active');
});

// ---------------------------------------------------------------------------
// internal helpers

const WORDSPLIT_RE = /\W+/;

function fnnoext(fn) {
  var a = path.basename(fn);
  var p = a.lastIndexOf('.');
  if (p === -1 || p === 0) return fn;
  return fn.substr(0, fn.length-(a.length-p));
}

// ---------------------------------------------------------------------------
// string matchers

function SubstringMatch(string, caseSensitive) {
  this.string = string;
  this.caseSensitive = caseSensitive;
}
SubstringMatch.prototype.test = function(fn){
  if (!this.caseSensitive) fn = fn.toLowerCase();
  return fnnoext(fn).indexOf(this.string) !== -1;
}
SubstringMatch.prototype.toString = function(){
  return this.string;
}

function PrefixOrWordMatch(string, caseSensitive) {
  this.string = string;
  this.caseSensitive = caseSensitive;
}
PrefixOrWordMatch.prototype.test = function(fn){
  if (!this.caseSensitive) fn = fn.toLowerCase();
  if (fn.indexOf(this.string) === 0) return true;
  fn = fnnoext(fn);
  var string = this.string;
  var words = fn.split(WORDSPLIT_RE);
  if (words.some(function(word){ return word === string; }))
    return true;
  if (words.pop().indexOf(this.string) === 0) return true;
}
PrefixOrWordMatch.prototype.toString = SubstringMatch.prototype.toString;

// ---------------------------------------------------------------------------
// public API

function Module(id) {
  process.EventEmitter.call(this);
  this.id = id;
  this.info = {};
  this.categories = [];
  this.depends = [];
}
sys.inherits(Module, process.EventEmitter);
exports.Module = Module;

Module.prototype.toString = function(detailed){
  return this.id;
}

Module.prototype.description = function(detailed){
  var version = (this.info.version ? ' ('+this.info.version+')' : '');
  var name = this.id;
  if (cli.isColorTerminal) {
    var R = '\033[0;0m';
    name = '\033[1;36m'+name+R;
    if (version.length)
      version = ' \033[1;34m'+version.trimLeft()+R;
  }
  if (detailed) {
    var s = [
      name+version
    ];
    if (this.categories.length)
      s.push('  Categories:  '+this.categories.join(', '));
    if (this.depends.length)
      s.push('  Depends:     '+this.depends.join(', '));
    if (this.info.url)
      s.push('  Website:     '+this.info.url);
    if (this.info.description) {
      var label = '  Description: ';
      var value = this.info.description.linewrap(label.length);
      s.push(label+value);
    }
    return s.join('\n');
  }
  else {
    return name + version+
      (this.info.description ? ' — '+this.info.description : '');
  }
}

Module.prototype.applyIndexContent = function(content, filename){
  var wrapper = "(function (exports, info, require, module, "+
    "__filename, __dirname) { " + content + "\n});";
  wrapper = process.compile(wrapper, filename);
  wrapper.apply(this.info, [this.info, this.info, require, this, 
      filename || '(string)',
      filename ? path.dirname(filename) : undefined]);
  
  var n = this.info;
  
  if (n.description) {
    var s = n.description;
    s = s.replace(/^[\s\._-]+|[\s\._-]+$/g, '');
    if (s.length === 0)
      delete n.description;
    n.description = s+'.';
  }

  if (n.categories) {
    if (Array.isArray(n.categories))
      this.categories = this.categories.concat(n.categories);
    else
      this.categories.push(n.categories);
  }

  if (n.depends) {
    if (Array.isArray(n.depends))
      this.depends = this.depends.concat(n.depends);
    else
      this.depends.push(n.depends);
  }

  if (n.github) {
    this.info.repo = 'git://github.com/'+n.github+'.git';
    this.info.url = 'http://github.com/'+n.github;
  }
  
  this.emit('info');
}

Module.prototype.loadFromIndex = function(filename, callback){
  var self = this;
  fs.readFile(filename, function(err, content){
    if (err) {
      if (callback) callback(err);
      return;
    }
    try {
      self.applyIndexContent(content, filename);
      if (callback) callback(null, self);
    }
    catch (e) {
      var p = e.stack.split('\n');
      p.splice(1,0,['    in '+filename]);
      e.stack = p.join('\n');
      if (callback) callback(e);
    }
  })
}

Module.prototype.clean = function(options, callback) {
  var self = this;
  fs.stat(options.checkoutDir, function(notfound) {
    if (notfound) {
      if (callback) callback();
      return;
    }
    self.emit('will-clean');
    sh.rm(options.checkoutDir, 'rf', function(err){
      if (!err) self.emit('did-clean');
      if (callback) callback(err);
    });
  });
}

Module.prototype._checkoutGit = function(options, callback) {
  this.emit('will-checkout');
  var self = this;
  var execopt = {worktree:options.checkoutDir, outbuf:false, errfwd:true};
  var args = ['checkout', '--force'];
  if (!options.verbose) args.push('--quiet');
  args.push(self.info.rev || self.info.repoBranch || 'master');
  git.exec(args, execopt, function(err, so, se){
    if (err && err.message && (
      (err.message.indexOf('HEAD is now at ') === 0) || 
      (err.message.indexOf('Already on  ') === 0)
    )) {
      err = null;
    }
    if (!err) self.emit('did-checkout');
    if (callback) callback(err);
  });
}

// todo: move most code into git module
Module.prototype._fetchGit = function(options, callback) {
  function fixargs(args) {
    if (options.verbose && cli.isTerminal) args.push('--verbose');
    else args.push('--quiet');
    return args;
  }
  var self = this;
  fs.stat(options.checkoutDir, function(err, stats) {
    if (!err && stats && stats.isDirectory()) {
      // found, so do a pull instead
      self.emit('will-fetch', 'patch');
      var args = ['pull', '--no-rebase'];
      args = fixargs(args);
      args.push('origin');
      args.push(self.info.repoBranch || 'master');
      var execopt = {worktree:options.checkoutDir, outbuf:false, errfwd:true};
      git.exec(args, execopt, function(err, so, se){
        self.emit('did-fetch');
        self._checkoutGit(options, callback);
      });
    }
    else {
      // not found -- do a clone
      self.emit('will-fetch', 'complete');
      var args = ['clone', self.info.repo, '--recursive'];
      args = fixargs(args);
      // --recursive = After the clone is created, initialize all submodules.
      if (self.info.rev)
        args.push('--no-checkout');
      else if (self.info.repoBranch)
        args = args.concat(['--branch', self.info.repoBranch]);
      args.push(options.checkoutDir);
      var execopt = {worktree:false, outbuf:false, errfwd:true};
      git.exec(args, execopt, function(err, so, se){
        self.emit('did-fetch');
        if (self.info.rev)
          self._checkoutGit(options, callback);
        else
          callback(err);
      });
    }
  });
}

Module.prototype.fetch = function(options, callback) {
  // fetch // todo: add support for other kinds of repositories
  if (!this.info.repo)
    return callback(new Error('No sources for module '+this));
  // todo: check what kind of repo it is and default to git
  return this._fetchGit(options, callback);
}

Module.prototype.configure = function(options, callback) {
  // todo: setup options.installLinks = [..]
  // todo: if (needed) ..
  return callback();
  this.emit('will-configure');
  this.emit('did-configure');
}

Module.prototype.build = function(options, callback) {
  // todo: build
  // todo: if (needed) ..
  return callback();
  this.emit('will-build');
  this.emit('did-build');
}

Module.prototype.activate = function(options, callback) {
  this.emit('will-activate');
  var self = this;
  if (!options.installLinks || options.installLinks.length === 0) {
    var e = new Error('Nothing to activate (no installLinks configured)');
    if (callback)
      callback(e);
    return e;
  }
  var args = ['ln', '-sf', ];
  sh.exec(args, {buffered:false}, function(err){
    self.emit('did-activate');
    callback(err);
  });
}

Module.prototype.install = function(options, callback) {
  /*
  Fetching packagename3 from git://github.com/john/package3.git
  Configuring packagename3
  Building packagename3
  Installing packagename3
  */
  // setup options
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (typeof options !== 'object') options = {};
  if (!options.checkoutDir)
    options.checkoutDir = path.join(exports.cacheDir, this.id);
  
  // queue jobs
  var jobs = new CallQueue(this, false, callback);
  
  if (options.force)
    jobs.push(function(cl){ this.clean(options, cl); });
  jobs.push(function(cl){ this.fetch(options, cl); });
  jobs.push(function(cl){ this.configure(options, cl); });
  jobs.push(function(cl){ this.build(options, cl); });
  jobs.push(function(cl){ this.activate(options, cl); });
  
  // start installation process
  jobs.start();
}

// Module functions

// Find modules
// find(String, Object, Function) -> EventEmitter
// @emits "module" (Module)
Module.find = function(query, options, callback) {
  if (!query) {
    throw new Error('missing query argument');
  }
  else if (typeof query !== 'string' && !(query instanceof RegExp)) {
    throw new Error('query argument must be a string (not '+
      (typeof query)+')');
  }
  // Normalize query to an object responding to test(String)
  if (query instanceof RegExp) {
    options.regexp = true;
  }
  else if (options.regexp || query.charAt(0) === '/') {
    // match as a regexp
    if (query.charAt(0) === '/') {
      var p = query.lastIndexOf('/');
      if (p === -1) {
        throw new Error(
          'Malformed regular expression -- missing ending "/" character')
      }
      query = new RegExp(query.substr(1,p-1), query.substr(p+1));
    }
    else {
      query = new RegExp(query, options.case_sensitive ? '' : 'i');
    }
  }
  else if (options.substr) {
    // match substrings
    query = new SubstringMatch(query, options.case_sensitive);
  }
  else {
    // match words and prefixes
    query = new PrefixOrWordMatch(query, options.case_sensitive);
  }
  
  // find matches
  var modules = [];
  var self = this, dir = exports.indexDir;
  var cl = fs.find(dir, query);
  cl.addCallback(function(err){
    callback(err, modules);
  });
  cl.addListener('file', function(relpath, abspath){
    if (path.extname(relpath) !== '.js')
      return;
    var module = new Module(fnnoext(relpath));
    cl.incr();
    module.loadFromIndex(path.join(dir, relpath), function(err) {
      if (cl.closed) return; // unrolling
      else if (err) return cl.close(err); // abort
      cl.emit('module', module);
      modules.push(module);
      cl.decr();
    });
  });
  
  return cl;
}
