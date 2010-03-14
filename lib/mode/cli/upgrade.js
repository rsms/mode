var install = require('./install');

exports.desc = 'Upgrade modules.';

exports.options = [].concat(install.options);
exports.options.shift();
exports.options.unshift('Usage: .. upgrade [options] <module> ..');

exports.main = function(args, options) {
  options.upgrade = true;
  return install.main.call(this, args, options);
}
