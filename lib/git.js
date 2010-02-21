var sys = require('sys')

// describe( [directory], callback(error, stdout, stderr) )
exports.describe = function(directory, callback) {
	var cwd;
	if (typeof directory === 'function') {
	  callback = directory;
	  directory = undefined;
	}
	else if (directory) {
		cwd = process.cwd();
		process.chdir(directory);
	}
	sys.exec('git describe --all --long', callback);
	if (directory)
		process.chdir(cwd);
}
