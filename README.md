# SYNOPSIS 
[![NPM Package](https://img.shields.io/npm/v/wasm-persist.svg?style=flat-square)](https://www.npmjs.org/package/wasm-persist)
[![Build Status](https://img.shields.io/travis/dfinity/wasm-persist.svg?branch=master&style=flat-square)](https://travis-ci.org/dfinity/wasm-persist)
[![Coverage Status](https://img.shields.io/coveralls/dfinity/wasm-persist.svg?style=flat-square)](https://coveralls.io/r/dfinity/wasm-persist)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

This allows you to hibernate a WebAssembly instance and later start it up again
at the exact place you left off

# INSTALL
`npm install wasm-persist`

# USAGE

```javascript
const persist = require('wasm-persist')
...
wasm = persit.prepare(wasm)
const {instance} = await WebAssembly.instantiate(wasm)
// call some exported functions on your instance 
// then when you are done
const state = persit.hibernate(instance)

...

// later you can revive the wasm instance
const {instance} = await WebAssembly.instantiate(wasm)
// just call persist.resume with the old state
persit.resume(instance, state)
```
# DESCIPTION
The Idea for wasm-perist came from [orthongal persistance](https://en.wikipedia.org/wiki/Persistence_(computer_science)#Orthogonal_or_transparent_persistence)
wasm-persist injects getter and setter function for each global and exports the 
memory and table if they exist. Hibernate calls the getters and creates an Object
that contains the memory (as a typedArray) the globals and the function table.
Resume does the opposite and calls the setters for the globals and updates the
memory and the table. Forgein function on the table are not handled currently.

# API
[./docs/](./docs/index.md)

# LICENSE
[MPL-2.0][LICENSE]

[LICENSE]: https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)
