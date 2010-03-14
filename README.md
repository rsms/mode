# Mode

Distributed [Node](http://nodejs.org/) module repository.

Mode aims to provide three things:

- Provide a simple command line tool for installing and managing node modules.
- Distribute hosting of modules -- each registered module is individually maintained and developed by it's author(s).
- Provide a standard index of known modules.

If you are a module developer you might be interested in reading the [Mode maintainers' guide](http://github.com/rsms/mode/blob/master/doc/maintainers-guide.md).


## Example use

This example assumes you have cloned mode and added the `bin` directory to your `PATH`.

    $ mode search sqlite
    database/sqlite — Bindings for SQLite3.
    $ mode install sqlite
    Installing sqlite@master
    > Fetching sqlite@master from git://github.com/grumdrig/node-sqlite.git
    > Configuring sqlite@master
    > Building sqlite@master
    > Activating sqlite@master
    Installed sqlite@master
    $

## Installing

Mode is installed by cloning this repository and can be placed wherever you want.

    $ git clone git://github.com/rsms/mode.git

Mode will put all activated modules in the "active" subdirectory. If you installed mode in your home directory, active modules will be found in `~/mode/active`. To make node find modules installed and activated by mode, you need to tell node about this path. There are many ways of doing so, but the recommended way is by using `~/.node_libraries`:

    $ ln -s mode/active .node_libraries

Now node will find all modules you install and activate using mode. You can of course still put other modules, not managed by mode, into your .node_libraries directory.

Also, add the `mode` program to your `PATH`. One way of doing so would be:

    $ ln -s mode/bin/mode ~/bin/mode

Assuming `~/bin` is a directory and already in `PATH`.


## Usage

    Usage: mode [global options] <command> [command options]
    Global options:
      --quiet, -q      Suppress all messages except errors.
      --verbose, -v    Print details.
      --debug, -d      Print too much details.
      --help, -h       Show this help message.
      --batch, -B      Batch mode (non-interactive).
    Commands:
      search           Find modules.
      install          Install modules.
      upgrade          Upgrade modules.
      list, ls         List installed or active modules.
      activate         Activate modules.
      deactivate       Deactivate modules.
      uninstall        Uninstall and deactivate modules.
      update           Update the module index.
      version          Print version of mode and exit.
      help             Display help for a command.

### Commands

#### search

Search and find modules in the module index.

    Usage: mode search [options] <query>
    Options:
      --regexp, -r            Treat <query> as a regular expression.
      --substr, -s            Treat <query> as a substring (instead of a word or pr
                              efix).
      --case-sensitive, -c    Make query case-sensitive. Default for --regexp query
                               without the "i" flag when --regexp.
      --help, -h              Show this message

#### install

Install and possibly activate modules.

    Usage: mode install [options] <module> ..
    Options:
      --force, -f               Force fetching and building even when not neccessar
                                y.
      --repo-uri, -u <s>        Override the repository defined by the index. Warni
                                ng: this might give you unexpected results.
      --repo-ref, -r <s>        Fetch a specific ref (branch, tag or revision), oth
                                er than the recommended default, from the module re
                                pository. Only applies to modules managed by revisi
                                on control systems like git.
      --install-path, -i <s>    Override installation location (Note: this is not t
                                he "active" location, but where a module version is
                                 "unpacked").
      --case-sensitive, -c      Make query case-sensitive. Default for --regexp que
                                ry without the "i" flag when --regexp.
      --help, -h                Show this message

#### upgrade

Upgrade modules to the latest versions. Performs about the same job as install, but will exit in error if one of the denoted modules are not installed. Also, upgrade will not activate or deactivate any modules.

    Usage: mode upgrade [options] <module> ..
    Options:
      --force, -f               Force fetching and building even when not neccessar
                                y.
      --repo-uri, -u <s>        Override the repository defined by the index. Warni
                                ng: this might give you unexpected results.
      --repo-ref, -r <s>        Fetch a specific ref (branch, tag or revision), oth
                                er than the recommended default, from the module re
                                pository. Only applies to modules managed by revisi
                                on control systems like git.
      --install-path, -i <s>    Override installation location (Note: this is not t
                                he "active" location, but where a module version is
                                 "unpacked").
      --case-sensitive, -c      Make query case-sensitive. Default for --regexp que
                                ry without the "i" flag when --regexp.
      --help, -h                Show this message

#### list, ls

List modules already installed or activated. Defaults to listing installed modules.

    Usage: mode list [options] [installed*|active] <query>
    Options:
      --regexp, -r            Treat <query> as a regular expression.
      --substr, -s            Treat <query> as a substring (instead of a word or pr
                              efix).
      --case-sensitive, -c    Make query case-sensitive. Default for --regexp query
                               without the "i" flag when --regexp.
      --help, -h              Show this message

#### activate

Activate modules. Active modules are exposed to node and are useable by other node modules.

    Usage: mode activate [options] <module> ..
    Options:
      --force, -f               Activate new module versions even if another versio
                                n of the module is active.
      --install-path, -i <s>    Override installation location (Note: this is not t
                                he "active" location, but where a module version is
                                 "unpacked").
      --case-sensitive, -c      Make query case-sensitive. Default for --regexp que
                                ry without the "i" flag when --regexp.
      --help, -h                Show this message

#### deactivate

Deactivate modules.

    Usage: mode deactivate [options] <module> ..
    Options:
      --force, -f               Do not raise an error if a module is not active.
      --install-path, -i <s>    Override installation location (Note: this is not t
                                he "active" location, but where a module version is
                                 "unpacked").
      --case-sensitive, -c      Make query case-sensitive. Default for --regexp que
                                ry without the "i" flag when --regexp.
      --help, -h                Show this message

#### uninstall

Remove an installed module (and deactivate it if active).

    Usage: mode uninstall [options] <module> ..
    Options:
      --force, -f               Do not raise an error if a module is not installed.
      --install-path, -i <s>    Override installation location (Note: this is not t
                                he "active" location, but where a module version is
                                 "unpacked").
      --case-sensitive, -c      Make query case-sensitive. Default for --regexp que
                                ry without the "i" flag when --regexp.
      --help, -h                Show this message

#### update

Update mode and the module index.

    Usage: mode update

#### version

Print version of mode (in git describe syntax) and exit.

Example:

    $ mode version
    mode v0.1.0-14-g4461500

#### help

Display help about a command.

Example:

    $ mode help list
    Usage: mode list [options] [installed*|active] <query>
    Options:
      --regexp, -r            Treat <query> as a regular expression.
      --substr, -s            Treat <query> as a substring (instead of a word or pr
                              efix).
      --case-sensitive, -c    Make query case-sensitive. Default for --regexp query
                               without the "i" flag when --regexp.
      --help, -h              Show this message


## Requirements

- [node](http://nodejs.org/) `>=0.1.31`
- [git](http://git-scm.com/) `>=1.6`

Yup, that's it.

## MIT license

Copyright (c) 2010 Rasmus Andersson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
