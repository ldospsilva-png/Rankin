// Node.js server template test
const serverOutput = `
  <script>
    const c = { periodicidade_sorteio: 10 }
    function formGroup(label, inputHtml) { return label + ': ' + inputHtml }
    const html = \`
      \${formGroup('Periodicidade', \`<input value="\${c.periodicidade_sorteio || 7}">\`)}
    \`
    console.log(html)
  </script>
`

console.log("--- SERVER OUTPUT TO BROWSER ---")
console.log(serverOutput)
