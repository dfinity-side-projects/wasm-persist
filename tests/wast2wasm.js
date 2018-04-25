const wabt = require('wabt')
const fs = require('fs')

function filesWast2wasm () {
  const srcFiles = fs.readdirSync(`${__dirname}/wast`)
  const wastFiles = srcFiles.filter(name => name.split('.').pop() === 'wast')
  for (let file of wastFiles) {
    const wat = fs.readFileSync(`${__dirname}/wast/${file}`).toString()
    file = file.split('.')[0]

    try {
      const mod = wabt.parseWat('module.wast', wat)
      const r = mod.toBinary({log: true})
      let binary = Buffer.from(r.buffer)
      if (!WebAssembly.validate(binary)) {
        throw new Error('invalid wasm binary')
      }
      fs.writeFileSync(`${__dirname}/wasm/${file}.wasm`, binary)
    } catch (e) {
      console.log(`failed at ${file}`)
      console.log(e)
    }
  }
}

filesWast2wasm()
