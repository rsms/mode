var sys = require('sys'),
    mode = require('mode');

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Find modules.';
exports.options = [
  'Usage: .. search [options] <query>',
  'Options:',
  ['regexp', 'Treat <query> as a regular expression.'],
  ['substr', 'Treat <query> as a substring (instead of a word or prefix).'],
  ['case-sensitive', 'Make query case-sensitive. Default for --regexp query without the "i" flag when --regexp.'],
]
exports.main = function(args, options) {
  var query = args.pop(),
      self = this;
  if (!query) {
    this.optionParser.educate('Error: missing query');
    process.exit(1);
  }
  mode.Module.find(query, options, function(err, modules){
    if (err) self.program.exit(err);
    modules.forEach(function(module){
      sys.puts(module.description(self.program.options.verbose));
    });
  });
}
