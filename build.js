const path = require('path')
const { spawn } = require('child_process')
const del = require('del')
const chokidar = require('chokidar')
const config = require(process.env.MPA_CONFIG)

const env = process.env.NODE_ENV
const isProd = env === 'production'
const cwd = process.cwd()

module.exports = function build(){

    let promiseCompleted
    const promise = new Promise(resolve => {
        promiseCompleted = resolve
    })
    
    const projectName = process.env.PROJECT
    let webpackProcess
    
    function webpackTask(file){
        const webpack = {
            start(file){
                webpack.stop(file)
                console.log(`${webpackProcess ? '重启' : '启动'}webpack编译${projectName.split('__')}...`)
                let webpackFile = isProd ? 'node_modules/webpack/bin/webpack.js' : 'node_modules/webpack-dev-server/bin/webpack-dev-server.js'
                webpackFile = path.join(__dirname, webpackFile)
                let args = [webpackFile, '--config', path.join(__dirname, 'webpack.config.js')]
                // args = [path.join(__dirname, 'run-webpack.js')]
                webpackProcess = spawn('node', args, {
                    env: process.env,
                    stdio: [0, 1, 2],
                    cwd,
                })
                
                webpackProcess.on('exit', () => {
                    if(isProd){
                        console.log(`webpack编译${projectName.split('__')}完成~`)
                        promiseCompleted()
                    }
                })
            },
            stop(file){
                if(webpackProcess){
                    console.log(`监测到${file}文件有变动`)
                    console.log('停止webpack编译...')
                }
                try{
                    webpackProcess.kill()
                }catch(err){}
            },
        }
        webpack.start(file)
    }
    
    if(isProd){
        // 删除之前版本文件...
        Promise.all(
            (config.languages || []).map(lang => {
                lang = lang === 'CN' ? '' : lang.toLowerCase() + '/'
                return del(`./dist/${lang}${projectName}`)
            })
        ).then(() => webpackTask())
    }else{
        webpackTask()
    }
    
    // 监听配置文件与模板文件是否有变动，有则重启webpack编译
    if(!isProd){
        let { watchForRestartWebpack } = config
        // add, addDir, change, unlink, unlinkDir, ready, raw, error
        chokidar.watch([
                ...['webpack.config.js', 'build/'].map(v => path.join(__dirname, v)),
                ...watchForRestartWebpack.map(v => path.join(cwd, v)),
                process.env.MPA_CONFIG,
            ])
            .on('unlink', webpackTask)
            .on('change', webpackTask)
    }
    
    return promise
}
