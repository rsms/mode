# Mode

Distributed [Node](http://nodejs.org/) module repository.

Mode aims to provide three things:

- Provide a simple command line tool for installing and managing node modules.
- Distribute hosting of modules -- each registered module is individually maintained and developed by it's author(s).
- Provide a standard index of known modules.

If you are a developer of a node module, you might be interested in reading the [Mode maintainers' guide](http://github.com/rsms/mode/blob/master/doc/maintainers-guide.md).


## Example use

This example assumes you have cloned mode and added the `bin` directory to your `PATH`.

    $ mode search crypto
    math/crypto — OpenSSL based Hashing, Signing and Verifying.
    $ mode --verbose search crypto
    math/crypto
      Website:     http://github.com/waveto/node-crypto
      Description: OpenSSL based Hashing, Signing and Verifying.
    $ mode install crypto
    Installing math/crypto
      Fetching math/crypto from git://github.com/waveto/node-crypto.git
      Configuring math/crypto
      Building math/crypto
      Activating math/crypto
    Installed math/crypto
    $ mode update
    Already up-to-date.
    $
    

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
