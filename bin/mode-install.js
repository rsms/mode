var sys = require('sys'),
    cli = require('cli');

function moduleInstaller(self, module, options) {
  // setup some logging
  var prefix = '> ';
  if (cli.isColorTerminal)
    prefix = '\033[1;33m'+prefix+'\033[0;0m';
  if (!options.quiet) {
    module.addListener('will-clean', function(){
      self.log(prefix+'Cleaning '+this);
    }).addListener('will-fetch', function(type){
      self.log(prefix+(type === 'patch' ? 'Updating' : 'Fetching')+
        ' '+this+' from '+this.info.repo);
    }).addListener('will-configure', function(){
      if (options.verbose) {
        var lines = [
          prefix+'Configuring '+this,
          'installDir:  '+this.installDir,
          'activePath:  '+this.activePath,
          'productPath: '+this.productPath,
          'repoRef:     '+this.repoRef,
        ];
        if (this.wscript)
          lines.push('wscript:    '+this.wscript);
        self.log(lines.join('\n  '));
      }
      else {
        self.log(prefix+'Configuring '+this);
      }
    }).addListener('will-build', function(){
      self.log(prefix+'Building '+this);
    }).addListener('will-activate', function(wasAlreadyActive){
      if (wasAlreadyActive)
        self.log(prefix+'Keeping already active '+this);
      else
        self.log(prefix+'Activating '+this);
    });
  }
  
  return function(closure){
    if (!options.quiet) {
      var msg = 'Installing '+module;
      if (cli.isColorTerminal) msg = '\033[1;33m'+msg+'\033[0;0m';
      self.log(msg);
    }
    module.install(options, function(err, lastesAlreadyInstalled){
      if (!err && !options.quiet) {
        var msg = 'Installed '+module;
        if (lastesAlreadyInstalled)
          msg = 'Latest version of '+module+' is already installed';
        if (cli.isColorTerminal) msg = '\033[1;32m'+msg+'\033[0;0m';
        self.log(msg);
      }
      if (err && 
          err.message.indexOf('Another module or version is active') !== -1
         )
      {
        err.message += ' Use the --force flag to activate '+module+' instead.';
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

  ['force',       'Force fetching and building even when not neccessary.'],

  ['repoURI',     'Override the repository defined by the index. Warning: '+
                  'this might give you unexpected results.',
                  {type: 'string', short: 'u', long: 'repo-uri'}],

  ['repoRef',     'Fetch a specific ref (branch, tag or revision), other than '+
                  'the recommended default, from the module repository. Only '+
                  'applies to modules managed by revision control systems '+
                  'like git.',
                  {type: 'string', short: 'r', long: 'repo-ref'}],

  ['installDir',  'Override installation location (Note: this is not the '+
                  '"active" location, but where a module version is '+
                  '"unpacked").',
                  {type: 'string', short: 'i', long: 'install-path'}],

  ['case-sensitive',
                  'Make query case-sensitive. Default for --regexp query '+
                  'without the "i" flag when --regexp.',
                  {short: 'c'}],
]
exports.main = function(args, options) {
  this.forEachModule(args, options, moduleInstaller);
}
