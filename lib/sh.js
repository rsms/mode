var sys = require('sys')
   ,fs = require('fs')

const fwdStdout = function(chunk){ if(chunk) fs.write(0, chunk); }
const fwdStderr = function(chunk){ if(chunk) fs.write(1, chunk); }

//exports.debug = true;

exports.escape = function(args) {
  if (Array.isArray(args))
    return args.map(exports.escape);
  else
    return "'"+String(args).replace("'","\\'")+"'";
}


function _exec(command, opt, env, callback) {
  var child, prevWdir, stderr = '', stdout = '';
  if (opt.wdir) {
    prevWdir = process.cwd();
    process.chdir(opt.wdir);
  }
  if (exports.debug)
    sys.debug('[sh.exec] '+command);
  child = process.createChildProcess("/bin/sh", ["-c", command], env);
  if (prevWdir)
    process.chdir(prevWdir);
  
  if (opt.outbuf)
    child.addListener("output", function(chunk){ if(chunk) stdout+=chunk; });
  if (opt.outfwd)
    child.addListener("output", fwdStdout);
  
  if (opt.errbuf)
    child.addListener("error", function(chunk){ if(chunk) stderr+=chunk; });
  if (opt.errfwd)
    child.addListener("error", fwdStderr);
  
  if (callback) {
    child.addListener("exit", function (code) {
      var e = null;
      if (code !== 0) {
        if (opt.errbuf) e = new Error(stderr);
        else e = new Error('Command "'+command+'" exited with '+code);
        e.code = code;
      }
      callback(e, stdout, stderr, code);
    });
  }
  return child;
};

function exec(args, options, env, callback) {
  var opt = {
    wdir: undefined,
    buffered: undefined,
    outbuf: true,
    outfwd: undefined,
    errbuf: true,
    errfwd: undefined,
  }
  if (typeof env === 'function') {
    callback = env;
    env = undefined;
  }
  else if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (typeof options === 'object') {
    process.mixin(opt, options);
  }
  if (opt.buffered !== undefined) opt.outbuf = opt.errbuf = opt.buffered;
  if (!opt.outbuf && opt.outfwd === undefined) opt.outfwd = true;
  if (!opt.errbuf && opt.errfwd === undefined) opt.errfwd = true;
  args = Array.isArray(args) ? exports.escape(args).join(' ') : String(args);
  return _exec(args, opt, env, callback);
}

exports.exec = exec;

// rm(string|array, [object|string], [function]) -> subprocess
exports.rm = function(filename, options, callback) {
  var opt = {
    recursive: false,
    verbose: false,
    force: false,
  }
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  else if (typeof options === 'string') {
    for (var i=0;i<options.length;i++) {
      var c = options.charAt(i);
      if (c === 'r') opt.recursive = true;
      else if (c === 'v') opt.verbose = true;
      else if (c === 'f') opt.force = true;
      else throw new Error('bad options '+sys.inspect(options));
    }
  }
  else if (typeof options === 'object') {
    process.mixin(opt, options);
  }
  var args = ['rm'];
  if (opt.recursive) args.push('-r');
  if (opt.verbose) args.push('-v');
  if (opt.force) args.push('-f');
  if (Array.isArray(filename)) args = args.concat(filename);
  else args.push(String(filename));
  exports.exec(args, opt, callback);
}
