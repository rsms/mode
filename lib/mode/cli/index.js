var sys = require('sys'),
    path = require('path'),
    fs = require('fs'),
    // deps
    git = require('../../deps/git'),
    cli = require('../../deps/cli'),
    // mode
    mode = require('../index'),
    util = require('../util');

mode.baseDir = path.dirname(__dirname);

var program = exports.program = new cli.Program([
  'Usage: mode [global options] <command> [command options]',
  'Global options:',
	['quiet',    'Suppress all messages except errors.'],
	['verbose',  'Print details.'],
	['debug',  'Print too much details.'],
	['help',  'Show this help message.'],
]);

program.addListener('options', function(){
  // activate debug mode?
  if (this.options.debug) {
    var prefix = 'DEBUG: ';
    if (cli.isColorTerminal)
      prefix = '\033[1;35m'+prefix+'\033[0;0m';
    sys.debug = function(){
      process.stdio.writeError(prefix+
        Array.prototype.slice.apply(arguments).join(' ') + "\n");
    }
    this.options.verbose = true;
    require('sh').debug = true;
  }
});

function activateModeLib(callback) {
  var m = new mode.Module('node/mode');
  m.customInstallDir = mode.baseDir+'/lib/mode';
  fs.stat(m.activePath, function(err, stats){
    if (err) {
      m.activate(function(err){
        callback(err, true);
      });
    }
    else {
      if (!stats.isDirectory()) {
        err = new Error('unable to activate mode library -- something else '+
          'exists at '+m.activePath);
        return callback(err);
      }
      return callback(null, false); // already active
    }
  });
}

// ----------------------------------------------------------------------------
// Helpers

program.mkModuleQuery = function (names, options, moduleOptions,
                                  moduleIsOptional)
{
  if (names.length === 0) {
    if (moduleIsOptional)
      return;
    require('trollop').p.educate('Error: missing module name');
    process.exit(1);
    return;
  }
  // module regexp
  var regsrc = [], query;
  for (var i=0;i<names.length;i++) {
    var name = names[i];
    var mopt = {}
    moduleOptions[name.toLowerCase().replace(/^[^\/]+\/|@.+$/, '')] = mopt;
    var m = name.match(/@(.+)$/);
    if (m) {
      mopt.repoRef = m[1];
      name = name.substr(0, m.index);
    }
    regsrc.push('(?:^|\\/)'+name.replace(/([^a-zA-Z0-9_-])/,'\\$1')+'\.js$');
  }
  try {
    query = new RegExp(regsrc.join('|'), 
      (options && options.case_sensitive) ? '':'i');
    //sys.error(query)
  }
  catch(e) {
    this.exit(1, 'Error: malformed module name(s) '+
                 names.map(sys.inspect).join(', '));
  }
  return query;
}

program.forEachModule = function(args, options, jobFactory) {
  var self = this,
      moduleOptions = {},
      query = this.mkModuleQuery(args, options, moduleOptions),
      queue = new util.CallQueue(this, function(err){if (err) self.exit(err);});
  mode.Module.find(query, options, function(err, modules){
    if (!err && options.installDir && modules.length > 1)
      err = new Error('--install-path can not be used for multiple modules');
    if (err) return self.exit(err);
    //sys.p(modules.map(function(x){return x.id}))
    // todo: resolve module dependencies and queue in order
    modules.forEach(function(module){
      var opts = {};
      process.mixin(opts, self.options, options, 
        moduleOptions[module.shortId.toLowerCase()]);
      queue.push(jobFactory(self, module, opts));
    });
  });
}

// ----------------------------------------------------------------------------
// Subcommands

program.cmd.version = {
  main: function(){
    git.describe(function(err, stdout, stderr) {
      if (err) this.exit(err);
      this.exit('mode '+stdout.trim());
    });
  },
  desc: 'Print version of mode and exit'
}

program.cmd.update = {
  main: function() {
    var args = ['pull', 'origin', 'master'];
    if (!this.options.verbose) args.push('--quiet');
    git.exec(args, {buffered:false}, function(err, o, e) {
      if (err) this.exit(err);
    });
  },
  desc: 'Update the module index.'
}

program.cmd.search = require('./search');
program.cmd.install = require('./install');
program.cmd.uninstall = require('./uninstall');
program.cmd.activate = require('./activate');
program.cmd.deactivate = require('./deactivate');

function main(basedir, argv) {
  if (basedir) mode.baseDir = basedir;
  return program.main(argv, function(){
    // execute git callbacks in the program
    git.context = this;
    // activate ourselves (if needed)
    activateModeLib(function(err, didActivate){
      if (err) sys.error(err);
      if (didActivate) program.log('activated mode library');
    });
  })
}
exports.main = main;
