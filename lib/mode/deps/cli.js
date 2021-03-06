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
exports.isTerminal = 'TERM' in process.env;
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

Program.prototype.getCommand = function(argv, canonicalName) {
  var command = this.cmd[canonicalName];
  if (command) {
    command.name = canonicalName;
    // parse command arguments
    var options = {};
    if (Array.isArray(command.options) && command.options.length) {
      options = trollop.options(argv, command.options, function(){
        this.stop_on_unknown();
      });
      command.optionParser = trollop.p;
      command.parsedOptions = options;
      command.program = this;
    }
  }
  return command;
}

exports.cmd_help = {
  desc: 'Display help for a command.',
  options: [
    'Usage: .. help command',
  ],
  main: function(argv, options) {
    if (!argv.length) {
      this.optionParser.educate('error: missing command after "help"');
      this.program.exit(1);
    }
    var commandName = argv.shift().toLowerCase();
    var command = this.program.getCommand([], commandName);
    if (!command) {
      this.optionParser.educate('error: unknown command '+
        sys.inspect(commandName));
      this.program.exit(1);
    }
    if (command.optionParser)
      command.optionParser.educate();
    else
      sys.error('No help for command '+sys.inspect(commandName));
  }
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
    if (!this.cmd.help)
      this.cmd.help = exports.cmd_help;
    this.options.push('Commands:');
    var names = Object.keys(this.cmd);
    var commands = {};
    var aliases = {};
    for (var i=0; i<names.length; i++) {
      var alias = names[i];
      var command = this.cmd[alias];
      var found = false;
      for (var name in commands) {
        var c = commands[name];
        if (c === command) {
          if (c.alias === undefined) c.alias = [alias];
          else c.alias.push(alias);
          found = true;
          break;
        }
      }
      if (!found)
        commands[alias] = command;
    }
    //sys.debug('aliases -> '+sys.inspect(aliases));
    names = Object.keys(commands);
    var maxlen = names.reduce(function(pv, cv, i, ary){
      return Math.max(pv, cv.length);
    },15/* minimum width */);
    for (var i=0; i<names.length; i++) {
      var name = names[i], command, dname;
      command = commands[name];
      dname = name;
      if (command.alias && Array.isArray(command.alias) && command.alias.length)
        dname += ', '+command.alias.join(', ');
      this.options.push('  '+dname.fillRight(maxlen)+'  '+
        (command.desc || ''));
    };
  }
  // parse options, replacing this.options
  if (!argv) argv = process.argv;
  this.options = trollop.options(argv, this.options, function(){
    this.stop_on(Object.keys(self.cmd));
  });
  this.optionParser = trollop.p;
  this.emit("options");
  // strip away ["node", "path/to/mode"]
  argv = argv.slice(2);
  // continue with command
  if (this.cmd) {
    // no command?
    if (!argv.length) { this.optionParser.educate(); this.exit(1); }
    // get command
    var commandName = argv.shift().toLowerCase();
    var command = this.getCommand(argv, commandName);
    if (!command) {
      this.optionParser.educate('error: unknown command "'+commandName+'"');
      this.exit(1);
    }
    else {
      // execute command
      this.emit("command", command);
      command.main.call(command, argv, command.parsedOptions || {});
    }
  }
}

Program.prototype.main = main;

})();
