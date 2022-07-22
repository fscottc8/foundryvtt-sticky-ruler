const path = require('path')

module.exports = {
  entry: './src/sticky-ruler.js',
  output: {
    filename: 'sticky-ruler.js',
    path: path.resolve(__dirname, 'dist'),
  }
}
