var sys = require('sys')
   ,printf = require('printf')
   ,trollop = require('trollop')

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

Program.prototype.main = function(argv) {
  this.emit("start");
  // add commands
  if (Object.keys(this.cmd).length === 0) {
    this.cmd = false;
  }
  else if (this.cmd) {
    this.options.push('\nCommands:');
    var names = Object.keys(this.cmd);
    var maxlen = names.reduce(function(pv, cv, i, ary){
      return Math.max(pv, cv.length);
    },0);
    for (var i=0; i<names.length; i++) {
      var name = names[i];
      var command = this.cmd[name];
      this.options.push(String.format('  %'+maxlen+'s  %s', name,
        command.desc || ''));
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
