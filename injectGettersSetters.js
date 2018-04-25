const leb128 = require('leb128').unsigned
const Pipe = require('buffer-pipe')
const Iterator = require('wasm-json-toolkit').Iterator

const EXTERNAL_KIND = {
  'function': 0,
  'table': 1,
  'memory': 2,
  'global': 3
}

module.exports = function prepare (wasm, include, symbol) {
  let globalI64SetterIndex, globalI32SetterIndex, globalGetterIndex, funcSection
  let numOfFuncs = 0
  let numOfImports = 0
  const addedCodeEntries = []
  const globalsGetterSetters = []

  const needExporting = {
    'function': [],
    'global': []
  }

  const it = new Iterator(wasm)

  for (const section of it) {
    if (section.type === 'type') {
      const numOfTypes = section.count
      // form: func, 1 param, i32, no return
      const globalI32SetterType = Buffer.from([0x60, 0x01, 0x7f, 0x0])
      // form: func, 2 param, i32, i32, no return
      const globalI64SetterType = Buffer.from([0x60, 0x02, 0x7f, 0x7f, 0x0])
      // form: func, 0 param, i32, 1 return
      const globalGetterType = Buffer.from([0x60, 0x00, 0x1, 0x7f])
      section.appendEntries([globalI32SetterType, globalI64SetterType, globalGetterType])

      globalI32SetterIndex = leb128.encode(numOfTypes)
      globalI64SetterIndex = leb128.encode(numOfTypes + 1)
      globalGetterIndex = leb128.encode(numOfTypes + 2)
    } else if (section.type === 'import') {
      // parse the import section to build the function indexes
      const json = section.toJSON()
      numOfImports = json.entries.filter(entry => entry.kind === 'function').length
    } else if (section.type === 'function') {
      // mark functions to be exported
      numOfFuncs = section.count
      funcSection = section
      needExporting['function'] = Array(section.count).fill(true)
    } else if (section.type === 'table') {
      needExporting['table'] = true && include.table
    } else if (section.type === 'memory') {
      needExporting['memory'] = true && include.memory
    } else if (section.type === 'global') {
      const json = section.toJSON()
      const addedFuncs = []
      if (!include.globals) {
        include.globals = new Array(json.entries.length).fill(true)
      }
      for (const i in json.entries) {
        const type = json.entries[i].type
        const lebIndex = leb128.encode(i)
        if (type.mutability && include.globals[i]) {
          if (type.contentType === 'i32') {
            globalsGetterSetters.push(type.contentType)
            addedFuncs.push(globalGetterIndex)
            addedFuncs.push(globalI32SetterIndex)
            // getter
            // size, local count, get_global, index, end
            addedCodeEntries.push(Buffer.concat([
              Buffer.from([0x03 + lebIndex.length, 0x00, 0x23]),
              lebIndex,
              Buffer.from([0x0b])
            ]))
            // setter
            // size, local count, get_local, index , set_global, index, end
            addedCodeEntries.push(Buffer.concat([
              Buffer.from([0x05 + lebIndex.length, 0x00, 0x20, 0x0, 0x24]),
              lebIndex,
              Buffer.from([0x0b])
            ]))
          } else {
            globalsGetterSetters.push(type.contentType)
            addedFuncs.push(globalGetterIndex)
            addedFuncs.push(globalGetterIndex)
            addedFuncs.push(globalI64SetterIndex)
            // 64 bit
            // getter high
            addedCodeEntries.push(Buffer.concat([
              Buffer.from([0x07 + lebIndex.length, 0x00, 0x23]),
              lebIndex,
              Buffer.from([0x42, 0x20, 0x88, 0xa7, 0x0b])
            ]))

            // get low
            addedCodeEntries.push(Buffer.concat([
              Buffer.from([0x04 + lebIndex.length, 0x00, 0x23]),
              lebIndex,
              Buffer.from([0xa7, 0x0b])
            ]))
            // (set_global $b
            //      (i64.add
            //        (i64.shl (i64.extend_u/i32 (get_local 0)) (i64.const 32)) 
            //        (i64.extend_u/i32 (get_local 1))))
            // setter
            addedCodeEntries.push(Buffer.concat([
              Buffer.from([0x0d + lebIndex.length, 0x00, 0x20, 0x01, 0xad, 0x42, 0x20, 0x86, 0x20, 0x00, 0xad, 0x7c, 0x24]),
              lebIndex,
              Buffer.from([0x0b])
            ]))
          }
        }
      }
      funcSection.appendEntries(addedFuncs)
    } else if (section.type === 'export') {
      // export the memory
      const addedExports = []
      if (needExporting['memory']) {
        const funcExp = generateFuncExport(`${symbol}memory`, 0, 'memory')
        addedExports.push(funcExp)
      }

      // export the table
      if (needExporting['table']) {
        const funcExp = generateFuncExport(`${symbol}table`, 0, 'table')
        addedExports.push(funcExp)
      }

      // export functions
      const funcs = needExporting['function']
      for (let index in funcs) {
        index = Number(index)
        const funcExp = generateFuncExport(`${symbol}func_${index + numOfImports}`, numOfImports + index, 'function')
        addedExports.push(funcExp)
      }

      // export globals
      let globalFuncIndex = 0
      for (let index in globalsGetterSetters) {
        const type = globalsGetterSetters[index]
        const funcIndex = numOfImports + numOfFuncs + globalFuncIndex
        if (type === 'i32') {
          // getter
          const getter = generateFuncExport(`${symbol}global_getter_${type}_${index}`, funcIndex, 'function')
          addedExports.push(getter)

          // setter
          const setter = generateFuncExport(`${symbol}global_setter_${type}_${index}`, funcIndex + 1, 'function')
          addedExports.push(setter)
          globalFuncIndex += 2
        } else {
          // i64s
          // setter high
          const setterHigh = generateFuncExport(`${symbol}global_getter_${type}_${index}_high`, funcIndex, 'function')
          addedExports.push(setterHigh)
          // setter Low
          const setterLow = generateFuncExport(`${symbol}global_getter_${type}_${index}_low`, funcIndex + 1, 'function')
          addedExports.push(setterLow)
          // getter
          const getter = generateFuncExport(`${symbol}global_setter_${type}_${index}`, funcIndex + 2, 'function')
          addedExports.push(getter)
          globalFuncIndex += 3
        }
      }
      section.appendEntries(addedExports)
    } else if (section.type === 'code') {
      section.appendEntries(addedCodeEntries)
    }
  }
  return it.wasm
}

function generateFuncExport (name, index, type) {
  const setterHigh = new Pipe()
  const fieldString = Buffer.from(name)
  leb128.write(fieldString.length, setterHigh)
  setterHigh.write(fieldString)
  setterHigh.write(Buffer.from([EXTERNAL_KIND[type]]))
  leb128.write(index, setterHigh)
  return setterHigh.buffer
}
