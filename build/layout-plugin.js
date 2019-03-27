const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
const config = require(process.env.MPA_CONFIG)

const cwd = process.cwd()
let cache = {}

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
                    // if(cache[data.html]){
                    //     data.html = cache[data.html]
                    //     cb(null, data)
                    //     return
                    // }
                    let outputName = data.outputName
                    let pluginData = data.plugin.options
                    let hash = compilation.hash.substr(0, 8)
                    let lang = null
                    let parsedHtml
                    let language = pluginData.lang.toLowerCase()
                    if(pluginData.i18n){
                        lang = require(pluginData.i18n)
                        if(!lang[pluginData.lang]){
                            lang = lang.EN
                            language = 'en'
                        }else{
                            lang = lang[pluginData.lang]
                        }
                        delete require.cache[require.resolve(pluginData.i18n)]
                    }
                    let title = pluginData.title
                    title = title[pluginData.lang] ? title[pluginData.lang] :
                            title.EN ? title.EN : title
                    
                    let renderData = {
                        title,
                        data: pluginData.data,
                        outputName,                        
                        lang,
                        langPath: pluginData.lang === 'CN' ? '' : '/' + pluginData.lang.toLowerCase(),
                        language,
                    }

                    if(pluginData.noLayout){
                        if(isProd){
                            parsedHtml = convertSrc(ejs.render(data.html, renderData), hash)
                            cache[data.html] = parsedHtml
                            data.html = parsedHtml
                        }
                        return cb(null, data)
                    }   

                    let layout = ejs.render(data.html, renderData)
                    renderData.layout = layout
                    
                    let  layoutFile = path.join(cwd, 'client/', pluginData.layoutFile)
                    let layoutLang = {}
                    let layoutLangFile
                    if(pluginData.layoutLang){
                        layoutLangFile = path.join(cwd, 'client/', pluginData.layoutLang)
                        layoutLang = require(layoutLangFile)
                        layoutLang = layoutLang[pluginData.lang] || layoutLang.EN
                    }
                    renderData.layoutLang = layoutLang
                    ejs.renderFile(layoutFile, renderData, (err, html) => {
                        if(err){
                            console.error(err)
                        }
                        if(isProd){
                            html = convertSrc(html, hash)
                        }
                        if(data.outputName.endsWith(outputName)){
                            cache[data.html] = html
                            data.html = html
                        }
                        cb(null, data)
                    })
                }
            )
        })
    }

}
