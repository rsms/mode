var sys = require('sys'),
    fs = require('fs'),
    trollop = require('./trollop');

// String additions
if (String.prototype.repeat === undefined)
String.prototype.repeat = function(times) {
  var v = [], i=0;
  for (; i < times; v.push(this), i++);
  return v.join('');
}

if (String.prototype.fillRight === undefined)
String.prototype.fillRight = function(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
}

// todo: check if we are doing output to a terminal (otherwise we do not 
// want this to be true)
exports.isTerminal = 'TERM' in process.env
exports.isColorTerminal = exports.isTerminal && 
  process.env.TERM.toLowerCase().indexOf('color');

(function(){
function Program(options) {
  process.EventEmitter.call(this);
  this.cmd = {};
  this.options = options || [];
  var self = this;
  process.addListener("uncaughtException", function(exc){
    self.exit(exc);
  });
}
sys.inherits(Program, process.EventEmitter);
exports.Program = Program;

// exit([int status], [Error], [message])
function exit(status, error, message) {
  if (typeof status === 'object') {
    error = status;
    status = undefined;
  }
  else if (typeof status === 'string') {
    message = status;
    status = undefined;
  }
  
  if (typeof error === 'string') {
    message = error;
    error = undefined;
  }
  
  if (error) {
    if (!status) status = 1;
    this.emit("exit", status);
    if (exports.isColorTerminal)
      fs.writeSync(1, '\033[1;31m');
    throw error;
    return;
  }

  if (message && message.length) {
    sys.error(message);
  }

  this.emit("exit", status);
  process.exit(status);
}
Program.prototype.exit = exit;

Program.prototype.log = function(msg, verbose) {
  if (verbose && !this.options.verbose)
    return;
  if (this.logSync)
    fs.writeSync(this.logFd || 0, msg+'\n');
  else
    fs.writeSync(this.logFd || 0, msg+'\n');
}

// main([Array argv], [Function modifier])
function main(argv, modifier) {
  var self = this;
  if (typeof argv === 'function') {
    modifier = argv;
    argv = undefined;
  }
  // avoid successive calls to main
  this.main = function(){ throw new Error('aready started'); }
  if (typeof modifier === 'function')
    modifier.call(this);
  this.emit("start");
  // add commands
  if (Object.keys(this.cmd).length === 0) {
    this.cmd = false;
  }
  else if (this.cmd) {
    this.options.push('Commands:');
    var names = Object.keys(this.cmd);
    var maxlen = names.reduce(function(pv, cv, i, ary){
      return Math.max(pv, cv.length);
    },15/* minimum width */);
    for (var i=0; i<names.length; i++) {
      var name = names[i];
      var command = this.cmd[name];
      this.options.push('  '+name.fillRight(maxlen)+'  '+
        (command.desc || ''));
    };
  }
  // parse options, replacing this.options
  if (!argv) argv = process.argv;
  this.options = trollop.options(argv, this.options, function(){
    this.stop_on(Object.keys(self.cmd));
  });
  this.emit("options");
  // strip away ["node", "path/to/mode"]
  argv = argv.slice(2);
  // continue with command
  if (this.cmd) {
    // no command?
    if (!argv.length) {
      trollop.p.educate();
      this.exit(1);
    }
    var requestedName = argv.shift();
    var canonicalName = requestedName.toLowerCase();
    var command = this.cmd[canonicalName];
    // invalid command?
    if (!command) {
      trollop.p.educate('error: invalid command "'+requestedName+'"');
      this.exit(1);
    }
    // parse command arguments
    var options = {};
    if (Array.isArray(command.options) && command.options.length) {
      options = trollop.options(argv, command.options, function(){
        this.stop_on_unknown();
      });
    }
    // execute command
    this.emit("command", command);
    command.main.call(this, argv, options);
  }
}

Program.prototype.main = main;

})();
