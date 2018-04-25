const inject = require('./injectGettersSetters.js')

/**
 * Prepares a binary by injecting getter and setter function for memory, globals and tables.
 * @param {ArrayBuffer} binary - a wasm binary
 * @param {Object} include
 * @param {Boolean} [include.memory=true] - whether or not to included memory
 * @param {Boolean} [include.table=true] - whether or not to included the function table
 * @param {Array.<Boolean>} [include.globals=Array.<true>] - whether or not to
 * included a given global. Each index in the array stands for a global index.
 * Indexes that are set to false or left undefined will not be persisted. By
 * default all globals are persisted.
 * @param {String} [symbol = '_'] - a sting used to prefix the injected setter and getter functions
 * @return {ArrayBuffer} the resulting wasm binary
 */
function prepare (binary, include = {memory: true, table: true}, symbol = '_') {
  return inject(binary, include, symbol)
}

/**
 * Given a wasm Instance this will produce an Object containing the current state of
 * the instance
 * @param {Webassembly.Instance} instance
 * @param {String} symbol - the symbol that will be used to find the injected functions
 * @returns {Object} the state of the wasm instance
 */
function hibernate (instance, symbol = '_') {
  const json = {
    globals: [],
    table: [],
    symbol
  }
  for (const key in instance.exports) {
    const val = instance.exports[key]
    if (key.startsWith(symbol)) {
      const keyElems = key.slice(symbol.length).split('_')
      // save the memory
      if (val instanceof WebAssembly.Memory) {
        json.memory = new Uint32Array(val.buffer)
      } else if (val instanceof WebAssembly.Table) {
        // mark the tables, (do something for external function?)
        // the external functions should have a callback
        for (let i = 0; i < val.length; i++) {
          const func = val.get(i)
          if (func === instance.exports[`${symbol}func_${func.name}`]) {
            json.table.push(func.name)
          }
        }
      } else if (keyElems[0] === 'global' && keyElems[1] === 'getter') {
        // save the globals
        const last = keyElems.pop()
        if (last === 'high') {
          json.globals.push([instance.exports[key]()])
        } else if (last === 'low') {
          json.globals[json.globals.length - 1].push(instance.exports[key]())
        } else {
          json.globals.push(instance.exports[key]())
        }
      }
    }
  }
  instance.__hibrenated = true
  return json
}

/**
 * resumes a prevously hibranted webassembly instance
 * @param {WebAssemby.Instance} instance
 * @param {Object} state - the pervous state of the wasm instance
 * @retrun {WebAssembly.Instance}
 */
function resume (instance, state) {
  if (instance.__hibrenated) {
    instance.__hibrenated = false
  } else {
    // initailize memory
    const mem = instance.exports[`${state.symbol}memory`]
    if (mem) {
      // console.log(mem.length)
      (new Uint32Array(mem.buffer)).set(state.memory, 0)
    }

    // initailize table
    if (instance.exports._table) {
      for (const index in state.table) {
        const funcIndex = state.table[index]
        instance.exports._table.set(index, instance.exports[`${state.symbol}func_${funcIndex}`])
      }
    }

    // intialize globals
    for (const index in state.globals) {
      const val = state.globals[index]
      if (Array.isArray(val)) {
        instance.exports[`${state.symbol}global_setter_i64_${index}`](val[1], val[0])
      } else {
        instance.exports[`${state.symbol}global_setter_i32_${index}`](val)
      }
    }
  }
  return instance
}

module.exports = {
  prepare,
  hibernate,
  resume
}
