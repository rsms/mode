var sys = require('sys'),
    fs = require('fs'),
    sh = require('./sh');
   
exports.dir = undefined;
exports.context = undefined;

function ctxcb(callback) {
  if (exports.context && callback) {
    return function(){
      callback.apply(exports.context, arguments);
    }
  }
  return callback;
}

// exec([args], [options], [callback])
exports.exec = function(args, options, callback) {
  var cmd = 'git ';
  var opt = {
    worktree: true, // bool use? | String dir
  }
  
  if (typeof args === 'function') {
    callback = args;
    args = undefined;
  }
  else if (!Array.isArray(args) && typeof args === 'object') {
    options = args;
    args = undefined;
  }
  
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  else if (typeof options === 'object') {
    process.mixin(opt, options);
  }
  
  var worktree = exports.dir;
  if (typeof opt.worktree === 'string')
    worktree = opt.worktree;
  if (worktree && opt.worktree)
    opt.wdir = worktree;
  
  if (Array.isArray(args))
    cmd += sh.escape(args).join(' ');
  else
    cmd += args;
  
  return sh.exec(cmd, opt, ctxcb(callback));
}

// describe( [directory], callback(error, stdout, stderr) )
exports.describe = function(options, callback) {
  exports.exec('describe --tags', options, callback);
}
