var search = require('./search');

exports.desc = 'List installed modules.';

exports.options = search.options.slice(1);
exports.options.unshift('Usage: mode list [options] [active|installed] <query>');

exports.main = function(args, options) {
  if (options.findInstalled === undefined)
    options.findInstalled = true;
  if (args.length > 1 && String(args[0]).toLowerCase().substr(0,1) === 'a') {
    options.findActive = true;
    options.findInstalled = false;
    args.shift();
  }
  else if (args.length === 1 && String(args[0]).toLowerCase() === 'active') {
    options.findActive = true;
    options.findInstalled = false;
    args.shift();
  }
  if (args.length === 0) {
    args.push('s');
  }
  return search.main.call(this, args, options);
}
