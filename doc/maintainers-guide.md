# Mode maintainers' guide

Mode provides a "blessed" and structured index of module *control files*. A *control file* is a node script which at minimum defines at least one source location for the module.

> **Note:** This documentation is a draft. Some parts are missing and some parts might be outdated.

## Control file

Let's have a look at an example *control file*:

    // example/bar.js
    info.description = "An example module";
    info.github = "foo/bar";

This file provides information about the "bar" module in the "example" category. It uses the short-hand `github` property to define its source and web site. If the source is not on github, the repo and url could be written directly like this:

    // example/bar.js
    info.description = "An example module";
    info.repo = "git://some.domain/~foo/git/bar.git";
    info.url = "http://baz.com/code/bar.html";

In other words, the actual module is located *outside* of mode. Mode does only provide the means to find and install the correct ones.

A *control file* is exposed to a set of script-local symbols:

- `info`, `this`, `exports` -- The module information object (alias for `module.info`).
- `module` -- The Module object. (instance of `mode.Module`).
- `require` -- Standard node `require` function.
- `__filename` -- Absolute filename of the current *control file*.
- `__dirname` -- Absolute filename of the parent directory of the current
  *control file*.


### Versioning

Mode takes a slightly different approach to versioning than most other package or module manager. Multiple versions of a module can be installed in parallel but more importantly, there is a notion of "latest version" ("master" branch in git-based repos). By default (if no explicit version is specified) a module is installed and keep up to date for it's "master" version. This means that ***control files* does not need to be changed for updates to propagate**. It's up to the user (and other modules dependencies) to choose one or more explicit versions.

However, a control file can specify a custom repository branch from which to fetch source and updates. This gives you as a module maintainer great flexibility as you can setup a "stable" or parhaps "mode" branch in which you keep your quality-assured and tested module while keeping daily development in the master branch.

Revisiting our `example/bar` control file:

    // example/bar.js
    info.description = "An example module";
    info.github = "foo/bar";
    info.repoBranch = "mode";

In this example, mode will keep users' default installations of your module in sync with the "mode" branch of your repo.

> Note that a user can override this using the `--repo-branch` and `--revision` 
  flag to `mode install`.


### Configuration

Most modules does not require any manual configuration. If you do not specify any "products", your module directory will be treated as the actual module. That is, if your module is called `example/bar` and checked out to `/cache/example/bar`, will be symbolically linked to `/library/bar` (simplified -- in reality its namespaced with version(s)).

#### Custom configuration

Normally you only need to configure (or specify) the "product" -- the file or directory which will house your module.

Let's revisit our dear `example/bar` control file with the addition of "product":

    // example/bar.js
    info.description = "An example module";
    info.github = "foo/bar";
    info.product = "lib/bar.js";

This tells mode that `lib/bar.js` should be activated (symlinked into your library directory). Paths are relative to the module source root.

> The name of the symlink will always be named after your module (e.g. "foo" in our example) no matter what the file is called in the repo.

#### Advanced configuration

During the *configuration* step a module control script can execute custom code by registering a `configure` member in it's `info`.

    info.description = "An example module";
    info.github = "foo/bar";
    info.configure = function(options, jobs, cl) {
      // <this>    will refer to the module instance
      // <options> is a union of command line options and internally 
      //           implied options
      // <jobs>    is a job queue on which you can queue async jobs which will
      //           be executed in an orderly, sequential fashion.
      jobs.push(function(jobdone){
        fs.readFile(__filename, function(err, content) {
          // do something awesome
          jobdone(err);
        })
      });
    }


## Installation steps

When a module is installed or updated (i.e. `mode install bar`) the following steps are taken in order:

1. [**load**] -- The module *control file* is loaded and executed. This step 
   is not visible to the user.

3. **fetch** -- The module source is either cloned/downloaded or pulled/patched.

4. **configure** -- The module is *configured*.

5. **build** -- The module is built, if applicable.

6. **activate** -- The module is activated (symbolic links are created/replaced
   within the local library directory).

If an error occurs, the process is aborted and the user is presented with a description of the error.

## Uninstallation steps

When a module is uninstalled (i.e. `mode uninstall bar`) the following steps are taken in order:

1. **deactivate** -- The module symlink is removed from the `active` directory.

2. **clear** -- The installed module is removed from the `active` directory, (effectively removing everything added by mode).

As a side note, the `deactivate` command performs the same task, except from purging the actual checkout (the module will be left in the `installed` directory and can later be activated using the `activate` command).
