var sys = require('sys')
exports.dir = undefined;

exports.exec = function(argstring, callback) {
  var cmd = 'git ';
  if (exports.dir)
    cmd += "--git-dir='"+exports.dir+"/.git' --work-tree=.. ";
  cmd += argstring;
  sys.exec(cmd, callback);
}

// describe( [directory], callback(error, stdout, stderr) )
exports.describe = function(callback) {
	exports.exec('git describe --tags', callback);
}
