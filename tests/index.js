const fs = require('fs')
const tape = require('tape')
const persit = require('../')

tape('empty', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/empty.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  persit.resume(wasmInstance.instance, json)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 0)

  t.end()
})

tape('custom', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/customSections.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  persit.resume(wasmInstance.instance, json)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 0)

  t.end()
})

tape('single type section', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleType.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 0)

  t.end()
})

tape('single import section', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleImport.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm, {foo: {bar () {}}})
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 0)

  t.end()
})

tape('single function', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleFunction.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 2)

  t.end()
})

tape('single table', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleTable.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [], table: ['0'], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 3)

  t.end()
})

tape('single table with foregn fuction', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleTable.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const wasmInstance2 = await WebAssembly.instantiate(wasm)
  wasmInstance.instance.exports._table.set(0, wasmInstance2.instance.exports.e)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 3)

  t.end()
})

tape('single table resume', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleTable.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)

  const wasmInstance2 = await WebAssembly.instantiate(wasm)
  persit.resume(wasmInstance2.instance, json)
  const json2 = persit.hibernate(wasmInstance2.instance)
  t.deepEquals(json, json2)
  t.equals(Object.keys(wasmInstance.instance.exports).length, 3)

  t.end()
})

tape('single memory', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleMemory.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.equals(json.memory.length, 16384)
  t.equals(Object.keys(wasmInstance.instance.exports).length, 3)

  t.end()
})

tape('skipping memory', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleMemory.wasm`)
  wasm = persit.prepare(wasm, '_', {memory: false})
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.equals(json.memory, undefined)
  t.equals(Object.keys(wasmInstance.instance.exports).length, 2)

  t.end()
})

tape('resuming memory', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleMemory.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)

  const wasmInstance2 = await WebAssembly.instantiate(wasm)
  persit.resume(wasmInstance2.instance, json)
  const json2 = persit.hibernate(wasmInstance2.instance)
  t.deepEquals(json, json2)
  t.equals(Object.keys(wasmInstance.instance.exports).length, 3)

  t.end()
})

tape('single i32 global', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleI32Global.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [-2], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 4)

  t.end()
})

tape('single i32 global', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleI32Global.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [-2], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 4)

  json.globals[0] = 8
  const wasmInstance2 = await WebAssembly.instantiate(wasm)
  persit.resume(wasmInstance2.instance, json)
  const json2 = persit.hibernate(wasmInstance2.instance)
  t.deepEquals(json2, {globals: [8], table: [], symbol: '_'})

  t.end()
})

tape('single i64 global', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleI64Global.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, {globals: [[-1, -2]], table: [], symbol: '_'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 5)

  t.end()
})

tape('resuming i64 global', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/singleI64Global.wasm`)
  wasm = persit.prepare(wasm)
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = {globals: [[99, 97]], table: [], symbol: '_'}
  persit.resume(wasmInstance.instance, json)
  const json2 = persit.hibernate(wasmInstance.instance)
  t.deepEquals(json, json2)
  t.equals(Object.keys(wasmInstance.instance.exports).length, 5)

  t.end()
})

tape('skipping some globals', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/doubleGlobals.wasm`)
  wasm = persit.prepare(wasm, {
    globals: [true]
  }, '_@')
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance, '_@')
  t.deepEquals(json, {globals: [-2], table: [], symbol: '_@'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 4)

  t.end()
})

tape('skipping some globals', async t => {
  let wasm = fs.readFileSync(`${__dirname}/wasm/doubleGlobals.wasm`)
  wasm = persit.prepare(wasm, {
    globals: [false, true]
  }, '_@')
  const wasmInstance = await WebAssembly.instantiate(wasm)
  const json = persit.hibernate(wasmInstance.instance, '_@')
  t.deepEquals(json, {globals: [[-1, -2]], table: [], symbol: '_@'})
  t.equals(Object.keys(wasmInstance.instance.exports).length, 5)

  t.end()
})
