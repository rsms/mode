var sys = require('sys'),
    cli = require('cli');

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Deactivate modules.';
exports.options = [
  'Usage: .. deactivate [options] <module> ..',
  'Options:',
  ['force',       'Do not raise an error if a module is not active.'],
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
  this.forEachModule(args, options, function(self, module, options) {
    return function(closure){
      if (!options.quiet) {
        var msg = 'Deactivating '+module;
        if (cli.isColorTerminal) msg = '\033[1;33m'+msg+'\033[0;0m';
        self.log(msg);
      }
      module.deactivate(options, function(err, wasActive){
        if (!wasActive && !options.force)
          err = new Error(module+' is not active');
        if (!err && !options.quiet) {
          var msg = 'Deactivated '+module;
          if (cli.isColorTerminal) msg = '\033[1;32m'+msg+'\033[0;0m';
          self.log(msg);
        }
        closure(err);
      });
    }
  });
}
