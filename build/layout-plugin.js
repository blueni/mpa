const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
const config = require(process.env.MPA_CONFIG)
const cwd = process.cwd()

if(config.delimiter){
    ejs.delimiter = config.delimiter || '?'
}

let srcReg = /((?:src(?:set)?|href)\s*=\s*['"])((?:\/static[^'",]*?,?\s*){1,})(['"])/g
let urlReg = /([\\\/]+static[\\\/].*?\.(?:jpe?g|png|gif|css|js))/g
let isProd = process.env.NODE_ENV === 'production'
let isCdn = !!process.env.IS_CDN
let publicPath = isCdn ? config.publicPath : ''

const convertSrc = (html, hash) => {
    return html.replace(srcReg, (v, $1, $2, $3) => {
        let srcs = $2.replace(urlReg, (v, $1) => {
            return `${publicPath}${$1}?v=${hash}`
        })
        return `${$1}${srcs}${$3}`
          
    })
}

module.exports = class LayoutPlugin {

    apply(compiler) {
        compiler.hooks.compilation.tap('LayoutPlugin', (compilation) => {
            compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync(
                'LayoutPlugin',
                (data, cb) => {
                    let outputName = data.outputName
                    let pluginData = data.plugin.options
                    let hash = compilation.hash.substr(0, 8)
                    let renderData = {
                        layout: data.html,
                        title: pluginData.title,
                        data: pluginData.data,
                        outputName,
                    }
                    if(pluginData.noLayout){
                        if(isProd){
                            data.html = convertSrc(data.html, hash)
                        }
                        return cb(null, data)
                    }
                    
                    let layoutFile = path.join(cwd, 'client/', pluginData.layoutFile)
                    ejs.renderFile(layoutFile, renderData, (err, html) => {
                        if(err){
                            console.error(err)
                        }
                        if(isProd){
                            html = convertSrc(html, hash)
                        }
                        if(data.outputName.endsWith(outputName)){
                            data.html = html
                        }
                        cb(null, data)
                    })
                }
            )
        })
    }

}
