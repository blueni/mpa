const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const os = require('os')
const fs2 = require('fs-extra')
const inquirer = require('inquirer')
const package = require('./pkg/package.json')

let CONFIG_FILE = 'mpa.config.js'
let cwd = process.cwd()

function start(configName = CONFIG_FILE){
    let config = path.join(cwd, configName)
    let configExists = fs.existsSync(config)
    
    if(!configExists){
        throw new Error(`找不到项目配置文件 ${config}`)
    }

    process.env.MPA_CONFIG = config
    require('./task')()
}

async function init(){
    // 初始化项目包文件
    await initPackage()
    // 拷贝项目文件
    await copyFiles()
    // 是否安装项目依赖
    await installDependencies()
    console.log('初始化MPA项目完成~')
}

async function initPackage(){
    package.name = path.basename(cwd)
    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify(package, null, 2), (err) => {
            if(err){
                reject(err)
                return
            }
            resolve()
        })
    })
}

async function copyFiles(){
    let source = path.join(__dirname, 'pkg')
    let files = fs.readdirSync(source)
    let tasks = []
    files.forEach((file) => {
        if(file === 'package.json'){
            return
        }
        let task = fs2.copy(path.join(source, file), path.join(cwd, file))
        tasks.push(task)
    })
    return Promise.all(tasks)
}

async function installDependencies(){
    let res = await inquirer.prompt([
        {
            name: 'install',
            type: 'confirm',
            message: '是否马上安装项目依赖？',
        }        
    ])
    if(!res.install){
        return
    }
    return runCommand('npm', ['install'], {
        cwd,
    })
}

function runCommand(command, args = [], options){
    let cmd = command
    if(os.platform() === 'win32'){
        args.unshift('/c', command)
        cmd = 'cmd.exe'
    }

    options = Object.assign({
        env: process.env,
        stdio: [0, 1, 2],
    }, options)
    return new Promise((resolve, reject) => {
        spawn(cmd, args, options)
            .on('exit', resolve)
            .on('close', resolve)
            .on('error', reject)
    })
}

exports.start = start
exports.init = init
