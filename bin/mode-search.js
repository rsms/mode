var sys = require('sys')

exports.desc = 'Search for a module.';
exports.options = [
  'Usage: .. search [options] <query>',
  'Options:',
  ['regexp', 'Treat <query> as a regular expression.'],
]
exports.main = function(args, options) {
  var args = Array.prototype.slice.apply(arguments)
  var query = args.pop();
  if (!query)
    throw new Error('missing query argument');
  sys.p(options)
}
