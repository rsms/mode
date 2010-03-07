var sys = require('sys')
   ,path = require('path')
   ,fs = require('fs')
   ,util = require('./util')

// -------------------------------------------------------------------------

/**
 * Collect (find) files and directories matching <filter> in <dirnames>.
 *
 * The returned Promise will emit two additional events:
 *  - "file" (String relativePath, String absolutePath, Object context)
 *  - "directory" (String relativePath, String absolutePath, Object context)
 *
 * If <assembleOrFileListener> is a function, it will be added as a listener
 * of the "file" event.
 *
 * If <assembleOrFileListener> is boolean true, all matching files and
 * directories will be buffered in an array which finally is passed to success
 * handlers of the returned Promise.
 */
fs.find = function(dirnames, filter, unbuffered, callback){
  if (!Array.isArray(dirnames))
    dirnames = [dirnames];
  if (typeof filter === 'function' && !(filter instanceof RegExp)) {
    callback = filter;
    filter = undefined;
  }
  else if (typeof unbuffered === 'function') {
    callback = unbuffered;
    unbuffered = undefined;
  }
  
  if (filter && !filter.test)
    filter.test = function(s){ return s === filter; }
  
  var cl = new util.RCB(callback);
  
  if (!unbuffered && callback) {
    var files = [], dirs = [];
    cl.addListener('file', function(relpath){ files.push(relpath); })
      .addListener('directory', function(relpath){ dirs.push(relpath); })
    cl.callback = function(err){ callback(err, files, dirs); };
  }
  
  cl.open();
  
  for (var i=0;i<dirnames.length && !cl.closed > -1;i++) {
    var ctx = {cl:cl, filter:filter};
    find_dir(ctx, dirnames[i]);
  }
  
  return cl.close();
}

function find_dir(ctx, srcdir) {
  if (ctx.basedir === undefined)
    ctx.basedir = srcdir;
  var callback = ctx.cl.handle();
  fs.readdir(srcdir, function(err, relnames) {
    if (err || !relnames) {
      if (err && err.message) err.message += " "+sys.inspect(srcdir);
      if (callback) callback(err);
      return;
    }
    for (var i=0;i<relnames.length;i++) {
      var relname = relnames[i];
      var absname = path.join(srcdir, relname);
      if (srcdir !== ctx.basedir)
        relname = path.join(srcdir.substr(ctx.basedir.length+1), relname);
      if (!ctx.filter || ctx.filter.test(relname))
        find_check(ctx, absname, relname);
      else
        find_check(ctx, absname, relname, true);
    }
    callback();
  });
}

function find_check(ctx, abspath, relpath, skipFile) {
  var callback = ctx.cl.handle();
  fs.stat(abspath, function(err, stats) {
    if (err) return callback(err);
    if (!skipFile && stats.isFile()) {
      ctx.cl.emit('file', relpath, abspath, ctx);
    }
    else if (stats.isDirectory()) {
      ctx.cl.emit('directory', relpath, abspath, ctx);
      find_dir(ctx, abspath);
    }
    callback();
  });
}

// -------------------------------------------------------------------------
// mkdirs

if (fs.mkdirs === undefined) {
  // mkdirs(path, [mode=(0777^umask)], [callback(err, pathsCreated)])
  fs.mkdirs = function (dirname, mode, callback) {
    if (typeof mode === 'function') {
      callback = mode;
      mode = undefined;
    }
    if (mode === undefined) mode = 0777 ^ process.umask();
    var pathsCreated = [], pathsFound = [];
    var makeNext = function() {
      var fn = pathsFound.pop();
      if (!fn) {
        if (callback) callback(null, pathsCreated);
      }
      else {
        fs.mkdir(fn, mode, function(err) {
          if (!err) {
            pathsCreated.push(fn);
            makeNext();
          }
          else if (callback) {
            callback(err);
          }
        });
      }
    }
    var findNext = function(fn){
      fs.stat(fn, function(err, stats) {
        if (err) {
          if (err.errno === process.ENOENT) {
            pathsFound.push(fn);
            findNext(path.dirname(fn));
          }
          else if (callback) {
            callback(err);
          }
        }
        else if (stats.isDirectory()) {
          // create all dirs we found up to this dir
          makeNext();
        }
        else {
          if (callback) {
            callback(new Error('Unable to create directory at '+fn));
          }
        }
      });
    }
    findNext(dirname);
  };
}
