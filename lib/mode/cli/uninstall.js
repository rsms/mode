var sys = require('sys'),
    cli = require('../deps/cli');

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Uninstall and deactivate modules.';
exports.options = [
  'Usage: .. uninstall [options] <module> ..',
  'Options:',
  ['force',       'Do not raise an error if a module is not installed.'],
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
  this.program.forEachModule(args, options, function(self, module, options) {
    return function(closure){
      if (!options.quiet) {
        var msg = 'Uninstalling '+module;
        if (cli.isColorTerminal) msg = '\033[1;33m'+msg+'\033[0;0m';
        self.log(msg);
      }
      module.uninstall(options, function(err, wasInstalled){
        if (!wasInstalled && !options.force)
          err = new Error(module+' is not installed');
        if (!err && !options.quiet) {
          var msg = 'Uninstalled '+module;
          if (cli.isColorTerminal) msg = '\033[1;32m'+msg+'\033[0;0m';
          self.log(msg);
        }
        closure(err);
      });
    }
  });
}
