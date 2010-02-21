var sys = require('sys')
exports.dir = undefined;
exports.context = undefined;

function ctxcb(callback) {
  if (exports.context) {
    return function(){
      callback.apply(exports.context, arguments);
    }
  }
  return callback;
}

exports.exec = function(argstring, callback) {
  var cmd = 'git ';
  if (exports.dir)
    cmd += "--git-dir='"+exports.dir+"/.git' --work-tree=.. ";
  cmd += argstring;
  sys.exec(cmd, ctxcb(callback));
}

// describe( [directory], callback(error, stdout, stderr) )
exports.describe = function(callback) {
  exports.exec('describe --tags', callback);
}
