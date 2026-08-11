import http from 'http'

http.get('http://localhost:3000', (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    const lines = data.split('\n')
    console.log('--- LINES 2485-2500 ---')
    for (let i = 2485; i <= 2500 && i < lines.length; i++) {
      console.log(`${i}: ${lines[i]}`)
    }
    console.log('--- LINES 3110-3130 ---')
    for (let i = 3110; i <= 3130 && i < lines.length; i++) {
      console.log(`${i}: ${lines[i]}`)
    }
  })
})
