const path = require('path')
const fs = require('fs')
const config = require(process.env.MPA_CONFIG)

const env = process.env.NODE_ENV
const isProd = env === 'production'
const publicPath = !!process.env.IS_CDN ? config.publicPath : '/'
let PROJECT = process.env.PROJECT.split('__')
const commonChunks = {}
const htmlPlugins = []
const cacheGroups = {}
const splitChunks = {
    cacheGroups,
}

if(isProd){
    PROJECT = [PROJECT[0]]
}

function recursiveIssuer(m) {
    if (m.issuer) {
        return recursiveIssuer(m.issuer)
    } else if (m.name) {
        return m.name
    } else {
        return false
    }
}

function getFilename(file){
    return path.parse(file).name.replace(/\./g, '-')
}

function getFiledir(file){
    return path.parse(file).dir.replace(/.*[\\\/]+/g, '')
}

function getRelativePath(file, base = ''){
    return ('./' + path.join(base, file)).replace(/[\\]+/g, '/')
}

function getEntryes(cfg){
    let { entryes, jsBase = '', htmlBase = '' } = cfg
    let obj = {}, common, vendors = []
    entryes.forEach(project => {
        if(!PROJECT.includes(project.name)){
            return
        }
        
        let name = project.name
        let items = project.items        
        project = Object.assign({jsBase, htmlBase}, project)
        delete project.items

        if(!common){
            common = name + '-common'
            commonChunks[common] = [common]
        }
        let file, pluginOption

        for(let entry of items){
            let jsEntry = entry.jsEntry
            entry = Object.assign({}, project, entry)
            if(jsEntry){
                file = getFilename(jsEntry)
                while(obj[file]){
                    let fullJsname = path.join(entry.jsBase, jsEntry)
                    if(obj[file] !== getRelativePath(fullJsname, entry.jsBase)){
                        file = getFiledir(fullJsname) + '-' + file
                    }         
                }
                obj[file] = getRelativePath(jsEntry, entry.jsBase)

                if(entry.template){
                    pluginOption = setHtmlPlugin(file, entry, project)
                }else{
                    vendors.push(file)
                }
            }else if(entry.template){
                setHtmlPlugin(null, entry, project)
            }
        }
    })
        
    cacheGroups[common] = {
        test: new RegExp(`[\\\\/]node_modules[\\\\/]|${vendors.join('|')}`),
        name: common,
        chunks: 'all',
    }

    htmlPlugins.forEach(plugin => {
        let chunks = plugin.chunks || []
        let noJsEntry = false
        if(!chunks.length && !plugin.noCommmon){
            noJsEntry = true
        }
        chunks = chunks.concat(commonChunks[common])
        if(noJsEntry){
            chunks.push(...vendors)
        }
        plugin.chunks = chunks
    })
    return obj
}

function setCacheGroupCss(file){
    if(file && isProd){
        cacheGroups[`${file}-css`] = {
            test: (m,c,entry = file) => m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
            name: file,
            chunks: 'all',
        }
    }
}

function setHtmlPlugin(file, entry, project){
    setCacheGroupCss(file)

    let {name, htmlBase, noLayout} = entry
    let template = entry.template

    if(!entry.noHtmlBasepath){
        template = getRelativePath(entry.template, htmlBase)
    }

    let chunks = file ? [file] : []
    let options = {
        template,
        filename: `${project.name}/${entry.filename || getFilename(template) + '.html'}`,
        chunks,
        inject: true,
        data: entry.data || {},
        layoutFile: entry.layoutFile,
        noLayout: !!entry.noLayout,
        projectName: project.name,
        noCommmon: !!entry.noCommmon,
        publicPath,
    }
    if(entry.title){
        options.title = entry.title
    }
    htmlPlugins.push(options)
    return options
}

exports.htmlPlugins = htmlPlugins
exports.entry = getEntryes(config)
exports.splitChunks = splitChunks
