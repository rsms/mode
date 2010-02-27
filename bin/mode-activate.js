var sys = require('sys'),
    mode = require('mode'),
    CallQueue = require('queue').CallQueue,
    cli = require('cli');

function moduleActivator(self, module, options) {
  return function(closure){
    if (!self.options.quiet) {
      if (cli.isColorTerminal) {
        var R = '\033[0;0m';
        self.log('\033[1;33m'+'Activating '+module+R);
      }
      else {
        self.log('Activating '+module);
      }
    }
    var opt = {};
    process.mixin(opt, self.options, options);
    module.activate(opt, function(err, wasAlreadyActive){
      if (!err && !opt.quiet) {
        var msg = 'Activated '+module;
        if (cli.isColorTerminal)
          msg = '\033[1;32m'+msg+'\033[0;0m';
        if (wasAlreadyActive) self.log(msg+' (was already active)');
        else self.log(msg);
      }
      closure(err);
    });
  }
}

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Activate modules.';
exports.options = [
  'Usage: .. activate [options] <module> ..',
  'Options:',

  ['installDir',  'Override installation location (Note: this is not the '+
                  '"active" location, but where a module version is '+
                  '"unpacked").',
                  {type: 'string', short: 'i', long: 'install-path'}],

  ['case-sensitive',
                  'Make query case-sensitive. Default for --regexp query '+
                  'without the "i" flag when --regexp.',
                  {short: 'c'}],
]
exports.main = function(args, options) {
  var self = this,
      query = this.mkModuleQuery(args),
      queue = new CallQueue(this, function(err){ if (err) self.exit(err); });
  
  mode.Module.find(query, options, function(err, modules){
    if (err) self.exit(err);
    //sys.p(modules.map(function(x){return x.id}))
    // todo: resolve module dependencies and queue in order
    modules.forEach(function(module){
      queue.push(moduleActivator(self, module, options));
    });
  });
}
