# Mode API

This is the mode API.

When you run mode the first time, it will "install" it's own module as `mode`.

## Example

Finding modules:

    $ node-repl
    node> mode = require("mode");
    node> mode.Module.find("sqlite", function(err, matchingModules) {
      puts(matchingModules.join(', '));
    })
    "sqlite@master"
    node>

Installing a module:

    $ node-repl
    node> mode = require("mode");
    node> mode.Module.find("sqlite", function(err, matchingModules) {
      var module = matchingModules[0];
      module.install(function(err) {
        puts("installed "+module);
      });
    })
    "sqlite@master"
    node>
