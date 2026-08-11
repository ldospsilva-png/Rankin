import fs from 'fs'
import path from 'path'

const file = fs.readFileSync(path.resolve('src/index.tsx'), 'utf-8')

// Find getHTML function
const htmlMatch = file.match(/function getHTML\(\) \{[\s\S]*?\n\}/)
if (!htmlMatch) {
  console.log('getHTML not found')
  process.exit(1)
}

const htmlFunc = htmlMatch[0]

// Extract everything inside <script> and </script>
const scriptStart = htmlFunc.indexOf('<script>')
const scriptEnd = htmlFunc.indexOf('</script>')

if (scriptStart === -1 || scriptEnd === -1) {
  console.log('<script> tag not found in getHTML')
  process.exit(1)
}

const scriptContent = htmlFunc.substring(scriptStart + 8, scriptEnd)

// Check for unescaped ${ inside scriptContent
// In Node.js template string, unescaped ${...} is evaluated on server side!
// We can check where ${ appears without preceding \
const lines = scriptContent.split('\n')
lines.forEach((line, index) => {
  // Find ${ that is NOT \${
  const matches = line.match(/(?<!\\)\$\{([^}]+)\}/g)
  if (matches) {
    console.log(`Line ${index + 1}: Unescaped server evaluation ->`, line.trim())
  }
})

console.log('Check completed.')
