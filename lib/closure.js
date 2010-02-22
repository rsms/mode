var sys = require('sys')

exports.RecursiveClosure = function(depth, closeEvent) {
  process.EventEmitter.call(this);
  if (typeof depth === 'string') {
    closeEvent = depth;
    depth = 0;
  }
  this.depth = depth ? Number(depth) : 0;
  this.autoclose = true;
  this.closeEvent = 'close';
  this.closed = false;
  this.addListener(this.closeEvent, function(){
    this.depth = -1;
    this.closed = true;
    if (this.debug) sys.debug(this+' close')
  });
}

sys.inherits(exports.RecursiveClosure, process.EventEmitter);

exports.RecursiveClosure.prototype.toString = function() {
  return "RecursiveClosure(closed="+this.closed+
    ",depth="+this.depth+
    ",closeEvent="+sys.inspect(this.closeEvent)+")";
}

exports.RecursiveClosure.prototype.incr = function(){
  if (this.debug) sys.debug(this+' incr => '+(this.depth+1))
  return ++this.depth;
}
exports.RecursiveClosure.prototype.decr = function(){
  if (this.debug) sys.debug(this+' decr => '+(this.depth-1))
  if ((--this.depth) === 0 && this.autoclose)
    exports.RecursiveClosure.prototype.close.apply(this, arguments);
  return this.depth;
}
exports.RecursiveClosure.prototype.close = function(){
  this.emit.apply(this,
    [this.closeEvent].concat(Array.prototype.slice.call(arguments)));
}
exports.RecursiveClosure.prototype.addCallback = function(){
  this.addListener.apply(this,
    [this.closeEvent].concat(Array.prototype.slice.call(arguments)));
}
