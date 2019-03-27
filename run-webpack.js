const path = require('path')
let webpackFile = process.env.NODE_ENV === 'production' ? 'node_modules/webpack/bin/webpack.js' : 'node_modules/webpack-dev-server/bin/webpack-dev-server.js'
// const webpack = require(path.join(__dirname, webpackFile))
// const config = require('./webpack.config')

process.argv[2] = path.resolve(__dirname, './webpack.config')
process.chdir(process.cwd())
require(path.join(__dirname, webpackFile))

// module.exports = new Promise((resolve, reject) => {
//     webpack(config, (err, stats) => {
//         if (err || stats.hasErrors()) {
//           // Handle errors here
//           reject(err)
//         }
//         // Done processing
//         resolve()
//     })
// }).catch(err => {
//     console.log('err is:', err)
// })
