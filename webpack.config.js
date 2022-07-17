const path = require('path')

module.exports = {
  entry: './src/sticky-ruler.js',
  output: {
    filename: 'sticky-ruler.js',
    // path: path.resolve(__dirname, 'dist'),
    path: path.resolve('C:/Users/Scott/AppData/Local/FoundryVTT/Data/modules/sticky-ruler', 'dist'),
  }
}
