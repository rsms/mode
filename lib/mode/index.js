var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    // dependencies
    git = require('../deps/git'),
    cli = require('../deps/cli'),
    sh = require('../deps/sh'),
    // mode libs 
    util = require('./util');

require('./std-additions');

var repr = sys.inspect;

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
exports._baseDir = path.dirname(__dirname);

exports.__defineGetter__('indexDir', function(){
  return path.join(exports.baseDir, 'index');
});
exports.__defineGetter__('installedDir', function(){
  return path.join(exports.baseDir, 'installed');
});
exports.__defineGetter__('activeDir', function(){
  return path.join(exports.baseDir, 'active');
});

exports.defaultRepoRef = 'master';

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
  this.depends = [];
  this.config = {};
}
sys.inherits(Module, process.EventEmitter);
exports.Module = Module;

Module.prototype.__defineGetter__('repoRef', function(){
  return this.config.repoRef || this.info.repoRef || exports.defaultRepoRef;
});

Module.prototype.__defineGetter__('shortId', function(){
  var p = this.id.lastIndexOf('/');
  return p === -1 ? this.id : this.id.substr(p+1);
});

Module.prototype.__defineGetter__('idPrefix', function(){
  var p = this.id.lastIndexOf('/');
  return p === -1 ? '' : this.id.substr(0, p);
});

Module.prototype.__defineGetter__('installId', function(){
  return path.join(this.id, this.repoRef);
});

Module.prototype.__defineGetter__('activeId', function(){
  var p = this.shortId;
  if (this.usesExplicitRef)
    p += '@'+this.repoRef;
  return p;
});

Module.prototype.__defineGetter__('installDir', function(){
  if (this.customInstallDir) return this.customInstallDir;
  return path.join(exports.installedDir, this.installId);
});

Module.prototype.__defineGetter__('productPath', function(){
  var p = [this.installDir];
  if (this.info.product) p.push(this.info.product);
  return p.join('/');
});

Module.prototype.__defineGetter__('productLink', function(){
  return path.relative(path.dirname(this.activePath), this.productPath);
});

Module.prototype.__defineGetter__('activePath', function(){
  return path.join(exports.activeDir, this.activeId)+
    path.extname(this.productPath);
});

Module.prototype.__defineGetter__('usesExplicitRef', function(){
  if (this.info.repoRef) return this.repoRef !== this.info.repoRef;
  else return this.repoRef !== exports.defaultRepoRef;
});

Module.prototype.toString = function(detailed){
  return this.shortId+'@'+this.repoRef;
}

Module.prototype.description = function(detailed){
  var name, ref = '@'+this.repoRef;
  var R = '\033[0;0m';
  if (cli.isColorTerminal) {
    name = '\033[1;34m'+this.idPrefix+'\033[1;30m'+'/'+
      '\033[1;36m'+this.shortId+
      R;
    if (ref.length)
      ref = '\033[1;30m'+ref+R;
  }
  else {
    name = this.id;
  }
  if (detailed) {
    var s = [name+ref];
    var labelw = '  Description: '.length;
    if (this.info.description) {
      var label = '  Description: ';
      var value = this.info.description.linewrap(labelw);
      s.push(label+value);
    }
    if (this.depends.length)
      s.push('  Depends:     '+this.depends.join(', ').linewrap(labelw));
    if (this.info.keywords)
      s.push('  Keywords:    '+this.info.keywords.join(', ').linewrap(labelw));
    if (this.info.url)
      s.push('  Website:     '+this.info.url.linewrap(labelw));
    return s.join('\n');
  }
  else {
    var sep = ' — ';
    if (cli.isColorTerminal)
      sep = '\033[1;30m'+sep+R;
    return name + 
      (this.info.description ? sep+this.info.description : '');
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

  if (n.depends) {
    if (Array.isArray(n.depends))
      this.depends = this.depends.concat(n.depends);
    else
      this.depends.push(n.depends);
  }

  if (n.github) {
    if (!this.info.repo) this.info.repo = 'git://github.com/'+n.github+'.git';
    if (!this.info.url) this.info.url = 'http://github.com/'+n.github;
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

// uninstall( [options], [callback(error, wasInstalled)] )
Module.prototype.uninstall = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (!this.config.isSetup)
    options = this._prepareConfig(options);
  
  var self = this;
  
  this.deactivate(options, function(err, wasActive) {
    if (err) {
      if (callback) callback(err);
      return;
    }
    fs.stat(self.installDir, function(notfound) {
      if (notfound) {
        if (callback) callback(null, false);
        return;
      }
      self.emit('will-uninstall');
      sh.rm(self.installDir, 'rf', function(err){
        if (!err) self.emit('did-uninstall');
        if (callback) callback(err, true);
      });
    });
  });
}

Module.prototype._checkoutGit = function(options, callback) {
  this.emit('will-checkout');
  var self = this;
  var args = ['checkout', '-f'];
  if (!options.verbose) args.push('-q');
  args.push(this.repoRef);
  args.push('--');
  var execopt = {
    worktree:this.installDir,
    outfwd:true,
    errfwd:true
  };
  git.exec(args, execopt, function(err, so, se){
    if (err && err.message && (
      (err.message.indexOf('HEAD is now at ') === 0) || 
      (err.message.indexOf('Already on  ') === 0)
    )) {
      err = null;
    }
    var noop = se.indexOf('HEAD is now at ') === -1;
    if (!err) self.emit('did-checkout', noop);
    if (callback) callback(err, noop);
  });
}

// todo: move most code into git module
Module.prototype._fetchGit = function(options, callback) {
  function fixargs(args) {
    if (options.verbose && cli.isTerminal) args.push('--verbose');
    else args.push('-q');
    return args;
  }
  var self = this;
  fs.stat(this.installDir, function(err, stats) {
    if (!err && stats && stats.isDirectory()) {
      // found, so do a pull instead
      self.emit('will-fetch', 'patch');
      var args = ['pull', '--no-rebase'];
      args = fixargs(args);
      args.push('origin');
      args.push(self.repoRef);
      var exopt = {worktree:self.installDir, outbuf:false, errfwd:true};
      git.exec(args, exopt, function(err, so, se){
        if (err) {
          if (callback) callback(err);
          return;
        }
        var upToDate = se.indexOf('Already up-to-date') === -1;
        self._checkoutGit(options, function(err, noop) {
          if (!err) self.emit('did-fetch', upToDate && noop);
          callback(err, upToDate && noop);
        });
      });
    }
    else {
      // not found -- do a clone
      // todo: find any other local clone of the same repo and pass the path of
      //       that repo as --reference <directory>.
      self.emit('will-fetch', 'complete');
      var args = ['clone', self.config.repoURI];
      args = fixargs(args);
      // --recursive = After the clone is created, initialize all submodules.
      // Though only available in cutting-edge git so lets not use it just yet.
      args.push('--no-checkout');
      args.push(self.installDir);
      var execopt = {worktree:false, outbuf:false, errfwd:true};
      git.exec(args, execopt, function(err, so, se){
        if (err) {
          if (callback) callback(err);
          return;
        }
        self._checkoutGit(options, function(err) {
          if (!err) self.emit('did-fetch', false);
          if (callback) callback(err, false);
        });
      });
    }
  });
}

Module.prototype.fetch = function(options, callback) {
  // fetch // todo: add support for other kinds of repositories
  if (!this.config.repoURI)
    return callback(new Error('No sources for module '+this));
  // todo: check what kind of repo it is and default to git
  return this._fetchGit(options, callback);
}

Module.prototype._findWscript = function(options, callback) {
  var self = this;
      wscriptPath = 'wscript',
      wscriptRequired = false;
  
  if (this.info.wscript) {
    wscriptPath = this.info.wscript.replace(/^\/+|\.{2,}|\/+$/, '');
    wscriptRequired = true;
  }
  
  wscriptPath = path.join(this.installDir, wscriptPath);
  
  fs.stat(wscriptPath, function(err, stats) {
    if (err) {
      if (err.errno === process.ENOENT && !wscriptRequired)
        err = undefined;
      if (callback) callback(err);
    }
    else if (!stats.isFile() && !stats.isSymbolicLink()) {
      if (wscriptRequired) {
        err = new Error('could not find required wscript at '+
          repr(wscriptPath));
      }
      if (callback) callback(err);
    }
    else if (callback) {
      callback(null, wscriptPath);
    }
  });
}

Module.prototype._configureWscript = function(options, callback) {
  var args = ['node-waf', 'configure'];
  var exopt = {
    wdir:   path.dirname(this.wscript),
    outbuf: false,
    errfwd: options.verbose ? true : false,
  };
  sh.exec(args, exopt, function(err, stdout, stderr) {
    callback(err);
  });
}

Module.prototype.configure = function(options, callback) {
  var self = this;
  var jobs = new util.CallQueue(this, false, callback);
  var findJobs = new util.CallQueue(this, false, function(){
    // any jobs?
    if (jobs.queue.length) {
      self.emit('will-configure');
      jobs.push(function(cl){ self.emit('did-configure'); cl(); });
    }
    jobs.start();
  });
  
  // run custom configure method
  if (typeof this.info.configure === 'function') {
    jobs.push(function(jobdone){
      var jobs_push = jobs.push;
      try {
        // if configure calls jobs.push, make sure those jobs are
        // executed directly after jobdone is invoked.
        jobs.push = jobs.pushPrioritized;
        self.info.configure.call(this, options, jobs2, jobdone);
      }
      finally {
        jobs.push = jobs_push;
      }
    });
  }
  
  // wscript
  findJobs.push(function(jobdone){
    this._findWscript(options, function(err, wscriptPath){
      if (!err && wscriptPath) {
        self.wscript = wscriptPath;
        jobs.push(function(jobdone){
          self._configureWscript(options, jobdone);
        });
      }
      jobdone(err);
    });
  });
  
  findJobs.start();
}

Module.prototype._buildWscript = function(options, callback) {
  var args = ['node-waf', 'build', '--jobs=2'];
  if (options.force)
    args.push('--nocache');
  var exopt = {
    wdir:   path.dirname(this.wscript),
    outbuf: false,
    errfwd: options.verbose ? true : false,
  };
  sh.exec(args, exopt, function(err, stdout, stderr) {
    callback(err);
  });
}

Module.prototype.build = function(options, callback) {
  var jobs = new util.CallQueue(this, false, callback);
  
  // this.wscript resolved in configure()
  if (this.wscript) {
    jobs.push(function(jobdone) {
      this._buildWscript(options, jobdone);
    });
  }
  
  // any jobs?
  if (jobs.queue.length) {
    this.emit('will-build');
    jobs.push(function(cl){ this.emit('did-build'); cl(); });
  }
  jobs.start();
}

Module.prototype.deactivate = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (!this.config.isSetup)
    options = this._prepareConfig(options);
  
  fs.unlink(this.activePath, function(err) {
    if (err) {
      if (err.errno === process.ENOENT)
        callback(null, false);
      else
        callback(err, false);
    }
    else {
      callback(null, true);
    }
  });
}

Module.prototype.activate = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (!this.config.isSetup)
    options = this._prepareConfig(options);
  if (!this.productPath) {
    var e = new Error('Nothing to activate (no product configured)');
    if (callback) callback(e);
    return e;
  }
  var self = this;
  var activePath = this.activePath;
  callback(null);
  
  var mklink = function(){
    self.emit('will-activate');
    // first, create the directories if needed
    fs.mkdirs(path.dirname(activePath), function(err, pathsCreated){
      if (err) {
        if (callback) callback(err);
        return;
      }
      fs.symlink(self.productLink, activePath, function(err){
        if (!err) {
          self.emit('did-activate');
        }
        else if (callback && err.stack) {
          err.stack = err.stack.substr(0,7)+
            'fs.symlink('+repr(self.productLink)+', '+repr(activePath)+'): '+
            err.stack.substr(7);
        }
        if (callback) callback(err);
      });
    });
  }
  
  fs.lstat(activePath, function(err, stats){
    if (err) {
      if (err.errno === process.ENOENT) {
        mklink();
      }
      else {
        // lstat failed
        if (callback) callback(err);
      }
    }
    else if (stats.isSymbolicLink()) {
      fs.readlink(activePath, function(err, link) {
        if (err) {
          if (callback) callback(err);
          return;
        }
        var resolved = path.normalize(path.join(activePath, link));
        if (resolved === self.productPath) {
          // already active
          // The "true" arg means the module was already active
          self.emit('will-activate', true);
          self.emit('did-activate', true);
          if (callback) callback(null, true);
        }
        else {
          if (options.force) {
            sh.rm(activePath, 'rf', function(err){
              if (!err) mklink();
              else if (callback) callback(err);
            });
          }
          else if (callback) {
            callback(new Error('Another module or version is '+
              'active at '+repr(activePath)));
          }
        }
      });
    }
    else {
      // something there, but not a symlink
      if (callback) {
        callback(new Error('target '+repr(activePath)+
          ' exists but is not a link'));
      }
    }
  });
}

Module.prototype._prepareConfig = function(options) {
  if (typeof options !== 'object') options = {};
  
  // short-hands
  var conf = this.config, info = this.info;
  conf.isSetup = true;
  
  // setup this.config
  if (!conf.installDir || options.installDir)
    conf.installDir = options.installDir || this.installDir;
  
  if (!conf.repoURI || options.repoURI)
    conf.repoURI = options.repoURI || info.repo;
  
  if (!conf.repoRef || options.repoRef)
    conf.repoRef = options.repoRef || info.repoRef || exports.defaultRepoRef;
  
  return options;
}

Module.prototype.install = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (!this.config.isSetup)
    options = this._prepareConfig(options);
  
  // queue jobs
  var jobs = new util.CallQueue(this, false, callback);
  
  //if (options.force)
  //  jobs.push(function(cl){ this.clean(options, cl); });
  jobs.push(function(cl){
    this.fetch(options, function(err, noop){
      // unroll the job queue if the package
      if (options.force) noop = false;
      cl(err, {unroll:noop, args:[noop]});
    });
  });
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
  var cl = fs.find(dir, query, function(err){
    modules.sort(function(a, b){ return (a.id < b.id) ? -1 : 1; });
    callback(err, modules);
  });
  cl.addListener('file', function(relpath, abspath){
    if (path.extname(relpath) !== '.js')
      return;
    var module = new Module(fnnoext(relpath));
    cl.open();
    module.loadFromIndex(path.join(dir, relpath), function(err) {
      if (err) return cl.close(err);
      cl.emit('module', module);
      modules.push(module);
      cl.close();
    });
  });
  
  return cl;
}
