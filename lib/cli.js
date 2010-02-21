var sys = require('sys')
   ,printf = require('./printf')
   ,trollop = require('./trollop')

require('string-additions')

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
Program.prototype.exit = function(status, error, message) {
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
    sys.error(error);
  }

  if (message && message.length) {
    sys.error(message);
  }

  this.emit("exit", status);
  process.exit(status);
}

// main([Array argv], [Function modifier])
Program.prototype.main = function(argv, modifier) {
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
    this.stop_on_unknown();
  });
  this.emit("options");
  // strip away ["node", "path/to/nmod"]
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
      trollop.p.educate('nmod: invalid command "'+requestedName+'"');
      this.exit(1);
    }
    // execute command
    this.emit("command", command);
    command.main.apply(this, argv);
  }
}
