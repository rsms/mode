var install = require('./install');

exports.desc = 'Upgrade modules.';

exports.options = install.options.slice(1);
exports.options.unshift('Usage: .. upgrade [options] <module> ..');

exports.main = function(args, options) {
  options.upgrade = true;
  return install.main.call(this, args, options);
}
