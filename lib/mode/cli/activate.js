var sys = require('sys'),
    cli = require('../deps/cli');

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Activate modules.';
exports.options = [
  'Usage: mode activate [options] <module> ..',
  'Options:',
  ['force',       'Activate new module versions even if another version of '+
                  'the module is active.'],
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
  this.program.forEachModule(args, options, function (self, module, options) {
    return function(closure){
      if (!self.options.quiet) {
        var msg = 'Activating '+module;
        if (cli.isColorTerminal) msg = '\033[1;33m'+msg+'\033[0;0m';
        self.log(msg);
      }
      module.activate(options, function(err, wasAlreadyActive){
        if (!err && !options.quiet) {
          var msg = 'Activated '+module;
          if (wasAlreadyActive) msg = 'Keeping already active '+module;
          if (cli.isColorTerminal) msg = '\033[1;32m'+msg+'\033[0;0m';
          self.log(msg);
        }
        closure(err);
      });
    }
  });
}
