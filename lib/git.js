var sys = require('sys')
   ,fs = require('fs')
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


const fwdStdout = function(chunk){ chunk && fs.write(0, chunk); }
const fwdStderr = function(chunk){ chunk && fs.write(1, chunk); }

function execUnbuffered(command, callback) {
  var child = process.createChildProcess("/bin/sh", ["-c", command]);
  child.addListener("output", fwdStdout);
  child.addListener("error", fwdStderr);
  if (callback) {
    child.addListener("exit", function (code) {
      if (code == 0) {
        callback(null, code);
      }
      else {
        var e = new Error('Command "'+command+'" exited with '+code);
        e.code = code;
        callback(e, code);
      }
    });
  }
  return child;
};

exports.exec = function(argstring, unbuffered, callback) {
  var cmd = 'git ';
  if (typeof unbuffered === 'function') {
    callback = unbuffered;
    unbuffered = undefined;
  }
  if (exports.dir)
    cmd += "--git-dir='"+exports.dir+"/.git' --work-tree=.. ";
  cmd += argstring;
  if (unbuffered)
    execUnbuffered(cmd, ctxcb(callback));
  else
    sys.exec(cmd, ctxcb(callback));
}

// describe( [directory], callback(error, stdout, stderr) )
exports.describe = function(callback) {
  exports.exec('describe --tags', callback);
}
