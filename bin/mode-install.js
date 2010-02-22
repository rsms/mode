var sys = require('sys'),
    mode = require('mode'),
    CallQueue = require('queue').CallQueue,
    cli = require('cli');

function moduleInstaller(self, module, options) {
  // setup some logging
  if (!options.quiet) {
    module.addListener('will-clean', function(){
      self.log('  Cleaning '+this);
    }).addListener('will-fetch', function(type){
      self.log('  '+(type === 'patch' ? 'Updating' : 'Fetching')+
        ' '+this+' from '+this.info.repo);
    }).addListener('will-configure', function(){
      self.log('  Configuring '+this);
    }).addListener('will-build', function(){
      self.log('  Building '+this);
    }).addListener('will-install', function(){
      self.log('  Installing '+this);
    })
  }
  
  return function(closure){
    if (!self.options.quiet) {
      if (cli.isColorTerminal) {
        var R = '\033[0;0m';
        self.log('\033[1;33m'+'Installing '+module+R);
      }
      else {
        self.log('Installing '+module);
      }
    }
    var opt = {};
    process.mixin(opt, self.options, options);
    module.install(opt, function(err){
      if (!err && !opt.quiet) {
        var msg = 'Installed '+module;
        if (cli.isColorTerminal)
          msg = '\033[1;32m'+msg+'\033[0;0m';
        self.log(msg);
      }
      closure(err);
    });
  }
}

// ---------------------------------------------------------------------------
// Subcommand

exports.desc = 'Install modules.';
exports.options = [
  'Usage: .. install [options] <module> ..',
  'Options:',
  ['case-sensitive', 'Make query case-sensitive. Default for --regexp query without the "i" flag when --regexp.'],
  ['force', 'Force fetching and building even when not neccessary.'],
]
exports.main = function(args, options) {
  var self = this;
  if (args.length === 0) {
    require('trollop').p.educate('Error: missing module name');
    process.exit(1);
  }
  // module regexp
  var regsrc = [];
  for (var i=0;i<args.length;i++) {
    var name = args[i];
    regsrc.push('(?:^|\\/)'+name.replace(/([^a-zA-Z0-9_-])/,'\\$1')+'\.js$');
  }
  try {
    query = new RegExp(regsrc.join('|'), options.case_sensitive ? '':'i');
    //sys.error(query)
  }
  catch(e) {
    this.exit(1, 'Error: malformed module name(s) '+
                 args.map(sys.inspect).join(', '));
    return;
  }
  // queue
  var installQueue = new CallQueue(this, function(err){
    if (err) self.exit(err);
  });
  mode.Module.find(query, options, function(err, modules){
    if (err) self.exit(err);
    //sys.p(modules.map(function(x){return x.id}))
    // todo: resolve module dependencies and queue in order
    modules.forEach(function(module){
      installQueue.push(moduleInstaller(self, module, options));
    });
  });
}
