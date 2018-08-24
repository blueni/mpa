const fs = require('fs')
const path = require('path')
const tar = require('tar-fs')
const { getSync } = require('sha')
const SSH2Shell = require('ssh2shell')
const { scp } = require('scp2')
const del = require('del')
const fastGlob = require('fast-glob')
// const OSS = require('ali-oss')
const config = require(process.env.MPA_CONFIG)
const cwd = process.cwd()

let isCdn = !!process.env.IS_CDN
let ssh = config.ssh
let remotePath = path.join(ssh.remotePath)
                    .replace(/[\\\/]+/g, '/')
let server = {
    host: ssh.host,
    port: ssh.port,
    user: ssh.user || ssh.userName,
    userName: ssh.user || ssh.userName,
    password: ssh.password,
}
let projectList = [],
    publishHistory = {},
    lastPublishHash = {},
    currentPublishHash = {},
    ignores = {},
    timestamp = Date.now()

const limitSize = 10
const publishHistoryFile = 'publish-history/publish.history.json'
const currentHashFile = `publish-history/publish-${timestamp}.json`
const zipFile = `publish-history/publish-project-${timestamp}.tar`
let zipEntries = []
let client
isCdn = false
if(isCdn){
    client = new OSS(ossConfig)
}

const noop = () => void 0

module.exports = async function start(projects = []){
    projectList = projects
    createHashObject()
    console.log('拉取历史上传结果...')
    await getHistoryHash()
    await getLastHistoryHash()
    console.log('拉取结束，开始与本地文件做对比...')
    if(await compareProject(isCdn ? ossUpload : noop)){
        console.log(`目录较上次没有变化，不用上传到服务器...`)
        return
    }
    console.log('对比结束，创建hash文件保存打包记录...')
    // 限制保存历史打包文件个数(默认10个)
    let expiredHashes = limitHistorySize()
    createHashFiles()
    if(isCdn){
        await ossUpload(publishHistoryFile)
        await ossUpload(currentHashFile)
    }
    console.log('hash文件创建完成，准备打包压缩文件...')
    await zipProjects()
    console.log('压缩文件完成，准备上传到服务器...')
    await uploadFile(zipFile, `${remotePath}/publish-history`)
    console.log('上传成功,准备解压...')
    await runShell(expiredHashes)
    console.log('解压文件完成，发布成功！')
}

function createHashObject(){
    publishHistory[timestamp] = {
        projectList,
    }
}

function downloadFile(file, dir = './'){
    return new Promise((resolve) => {
        if(isCdn){
            client.get(file, file)
                .then(resolve)
                .catch(resolve)
            return
        }
        scp(Object.assign({
            path: `${remotePath}/${file}`,
        }, server), dir, resolve)
    })
}

async function getHistoryHash(){
    await downloadFile(publishHistoryFile, './publish-history')
    try{
        publishHistory = Object.assign(publishHistory, require(`./${publishHistoryFile}`))
    }catch(err){}
    if(!Array.isArray(publishHistory.history)){
        publishHistory.history = []
    }
}

async function getLastHistoryHash(){
    let history = publishHistory.history.slice()
    let last, lastInfo
    let projects = projectList.slice()
    let historyHash
    while(last = history.pop()){
        let file = `publish-history/publish-${last}.json`
        lastInfo = publishHistory[last].projectList
        await downloadFile(file, './publish-history')
        historyHash = require(`./${file}`)
        try{
            for(let key in historyHash){
                if(!lastPublishHash[key]){
                    lastPublishHash[key] = historyHash[key]
                }
            }
        }catch(err){}
        for(let i=0;i<projects.length;i++){
            if(lastInfo.includes(projects[i])){
                projects.splice(i, 1)
                i--
            }
        }
        if(!projects.length){
            return
        }
    }
}

function limitHistorySize(size = limitSize){
    let { history } = publishHistory
    let temp
    let expiredHashes = []
    while(history.length > size){
        temp = history.shift()
        del(`publish-history/publish-project-${temp}.tar`)
        del(`publish-history/publish-${temp}.json`)
        expiredHashes.push(temp)
    }
    return expiredHashes
}

async function compareProject(upload = noop){
    let globs = [...projectList.map(v => `dist/${v}`), 'static']
    let isSame = true, glob
    for(let i=0;i<globs.length;i++){
        glob = globs[i]
        let files = await fastGlob(glob + '/**/*.*')

        isSame = true
        files.forEach((name) => {
            let file = path.join(cwd, name)
            let hash = getSync(file)
            name = name.replace(/\\/g, '/')
            currentPublishHash[name] = hash
            if(!lastPublishHash[name] || lastPublishHash[name] !== hash){
                isSame = false
                if(isCdn){
                    upload(name.replace(/^[\\\/]?dist[\\\/]+/, ''), name)
                }
                return
            }
            ignores[name] = true
        })
        if(isSame){
            globs.splice(i, 1)
            i--
        }
    }
    zipEntries = globs
    return !globs.length
}

function createHashFiles(){    
    let publishHashFile = path.join(cwd, currentHashFile)
    fs.writeFileSync(publishHashFile, JSON.stringify(currentPublishHash), 'utf-8')
    publishHistory.history.push(timestamp)
    fs.writeFileSync(path.join(cwd, publishHistoryFile), JSON.stringify(publishHistory), 'utf-8')
}

function zipProjects(){
    return new Promise((resolve) => {
        tar.pack('./', {
            entries: [...zipEntries, publishHistoryFile, currentHashFile],
            readable: true,
            writable: true,
            map(header){
                header.name = header.name.replace(/^[\\\/]?dist[\\\/]+/, '')
                return header
            },
            ignore(name){
                name = name.replace(/\\/g, '/')
                return !!ignores[name]
            },
        })
        .pipe(fs.createWriteStream(path.join(cwd, zipFile)))
        .on('close', resolve)
    })
}

function uploadFile(file, path = remotePath){
    return new Promise((resolve, reject) => {
        scp(file, Object.assign({
            path,
        }, server), (err) => {
            if(err){
                console.error(err)
                reject(err)
                return
            }
            resolve()
        })
    })
}

function runShell(expiredHashes){
    let commands = [
        `mkdir -p ${remotePath}/publish-history`,
        `cd ${remotePath}`,
        ...zipEntries.map(v => v.replace(/[\\\/]*dist[\\\/]*/g, ''))
                    .filter(v => projectList.includes(v))
                    .map((v) => `rm -rf ${v}`),
        `tar -xf ${zipFile}`,
        `rm -f ${zipFile}`,
        ...expiredHashes.map(v => `rm -f publish-history/publish-${v}.json`),
    ]
    return new Promise((resolve) => {
        new SSH2Shell({
            server,
            commands,
            onEnd: resolve,
            onError: console.error,
        }).connect()
    })
}

async function ossUpload(objectKey, file = objectKey){
    try{
        await client.put(objectKey, file)
        console.log(`上传${file}文件成功...`)
    }catch(err){
        console.error(`上传${file}文件失败...`)
    }
}
