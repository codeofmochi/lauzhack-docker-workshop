const express = require('express')
const app = express()
const port = 3001

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

app.get('/', (req, res) => {
  res.json({ value: rollDice() })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})