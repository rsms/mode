
function CallQueue(context, autostart, callback) {
  if (typeof autostart === 'function') {
    callback = autostart;
    autostart = undefined;
  }
  this.queue = [];
  this.autostart = autostart === undefined ? true : autostart;
  this.context = context || this;
  this.callback = callback;
  this.stopped = true;
  var self = this;
  this.closure = function(err){
    if (err) {
      self.error = err;
      self.stopped = true;
      self.queue = [];
      if (self.callback) self.callback(err);
    }
    else {
      self.queue.shift(); // dequeue finalized
      self.performNext();
    }
  }
}
exports.CallQueue = CallQueue;

CallQueue.prototype.toString = function() {
  return 'CallQueue(stopped='+sys.inspect(this.stopped)+
    ',context='+String(this.context).substr(0,25)+')';
}

CallQueue.prototype.start = function(callback) {
  this.stopped = false;
  if (callback && this.callback !== callback) {
    if (this.callback) this.callback();
    this.callback = callback;
  }
  this.performNext();
}

CallQueue.prototype.stop = function() {
  this.stopped = true;
}

CallQueue.prototype.push = function(callable) {
  if (this.error)
    throw new Error(this+' is closed because of a previous error');
  this.queue.push(callable);
  if (this.queue.length === 1 && this.autostart)
    this.start();
}

CallQueue.prototype.performNext = function() {
  if (!this.autostart) this.autostart = true; // if more are push() ed
  var callable = this.queue[0];
  if (callable && !this.stopped) {
    callable.call(this.context, this.closure);
  }
  else {
    // queue is empty or this.stopped
    if (this.callback) this.callback();
    this.autostart = false;
  }
}
