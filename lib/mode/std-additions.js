var sys = require('sys')
   ,path = require('path')
   ,fs = require('fs')
   ,util = require('./util')

// -------------------------------------------------------------------------
// fs

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

//------------------------------------------------------------------------------
// path

if (!path.relativeArray) {
  path.relativeArray = function(base, target) {
    base = path.normalizeArray(base);
    target = path.normalizeArray(target);
    var commonality = 0, npath = [];
    if (target.length === 0) return base;
    if (target[0] !== '') return base.concat(target);
    for (; commonality < base.length; commonality++) {
      var bc = base[commonality], tc = target[commonality];
      if (bc !== tc)
        break;
    };
    if (commonality > 0) {
      if (commonality > 1 || base[0] !== '') {
        for (var x=commonality; x < base.length; x++)
          npath.push('..');
      }
      else {
        npath.push('');
      }
    }
    for (; commonality < target.length; commonality++)
      npath.push(target[commonality]);
    return npath;
  };
  path.relative = function(base, target) {
    base = base.replace(/\/+$/, '').split('/');
    target = target.replace(/\/+$/, '').split('/');
    return path.relativeArray(base, target).join('/');
  };
}

//------------------------------------------------------------------------------
// process

// Fix process.umask in <=0.1.31
try { process.umask(); }
catch(e) {
  if (e.toString().indexOf('argument must be an integer') !== -1) {
    var _process_umask = process.umask;
    process.umask = function(newmask){
      if (!newmask) {
        var old = _process_umask(0); // read and clear
        _process_umask(old); // reset
        return old;
      }
      else {
        return _process_umask(newmask);
      }
    }
  }
}

//------------------------------------------------------------------------------
// String

String.prototype.repeat = function(times) {
  var v = [], i=0;
  for (; i < times; v.push(this), i++);
  return v.join('');
}

String.prototype.fillLeft = function(length, padstr) {
  if (this.length >= length) return this;
  return String(padstr || " ").repeat(length-this.length) + this;
}

String.prototype.fillRight = function(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
}

String.prototype.linewrap = function(prefix, linewidth, lineglue) {
  if (typeof prefix === 'number') prefix = ' '.repeat(prefix);
  else if (!prefix) prefix = '';
  if (!linewidth) linewidth = 79;
  if (!lineglue) lineglue = '\n';
  var value = this.trimRight();
  if (prefix.length + value.length <= linewidth)
    return value;
  var mlen = linewidth-prefix.length, buf = [], offs = 0, p;
  while (offs < value.length) {
    p = value.length-offs > mlen ? value.lastIndexOf(' ', offs+mlen) : -1;
    if (p === -1) {
      // todo: force-split very long strings
      buf.push(value.substr(offs));
      break;
    }
    buf.push(value.substring(offs, p));
    offs = p+1; // +1 for " "
  }
  return buf.join(lineglue+prefix);
}
