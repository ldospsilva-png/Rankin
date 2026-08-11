import fs from 'fs'
import path from 'path'

const file = fs.readFileSync(path.resolve('src/index.tsx'), 'utf-8')

const scriptStart = file.indexOf('<script>')
const scriptEnd = file.indexOf('</script>')

if (scriptStart === -1 || scriptEnd === -1) {
  console.log('Script tag bounds:', scriptStart, scriptEnd)
  process.exit(1)
}

const scriptContent = file.substring(scriptStart + 8, scriptEnd)
const lines = scriptContent.split('\n')

lines.forEach((line, index) => {
  // Regex to find ${ that is NOT escaped as \${
  const matches = line.match(/(?<!\\)\$\{([^}]+)\}/g)
  if (matches) {
    console.log(`Line ${index + 1}: ${matches.join(', ')} | Content: ${line.trim()}`)
  }
})

console.log('Done searching script content.')
