const os = require('os')
const build = require('./build.js')
const inquirer = require('inquirer')
const { entryes } = require(process.env.MPA_CONFIG)
const isProd = process.env.NODE_ENV === 'production'
let [, , task] = process.argv
let projects
const cpus = os.cpus()

module.exports = function selectProject(){
    return inquirer.prompt({
        type: 'checkbox',
        name: 'select',
        message: `请选择需要构建的项目`,
        choices: entryes.map(project => {
            return {
                name: `${project.name} ${project.description}`,
                value: project.name
            }
        })
    }).then(res => {
        projects = res.select
        projectName = projects.join('__')
        runProject()
    })
}

function projectExisits(name = projectName){
    let projectIsExsits = false    
    name = (name || '').split('__')

    entryes.forEach(project => {
        if(name.includes(project.name)){
            projectIsExsits = true
        }
    })
    
    return projectIsExsits
}

async function runProject(){
    if(!projectExisits()){
        throw new Error(`${projectName}项目不存在`)
    }
    process.env.PROJECT = projectName

    // 开发环境直接所有项目都构建在一起
    if(!isProd){
        return build().then(process.exit)
    }

    // 生产环境每个子项目都单独打包，根据电脑cpu数量多进程并行构建
    let failedTasks = await new Promise(resolve => {
        let res = []
        let tasks = []
        let maxProcess = cpus.length
        let length = projects.length
        let finished = 0

        while(maxProcess--){
            tasks.push(projects.shift())
        }

        function runTasks(){
            let name
            while(name = tasks.shift()){
                runBuild(name)
            }
        }

        async function runBuild(name){
            try{
                await build(name)
            }catch(err){
                res.push(name)
            }

            finished++
            let project = projects.shift()
            if(project){
                tasks.push(project)
                runTasks()
            }
            if(finished == length){
                resolve(res)
            }
        }

        runTasks()
    })

    if(failedTasks.length){
        console.log(`构建${failedTasks.join(',')}失败!`)
    }
    
    if(task === 'publish'){
        require('./publish.js')(projectName.split('__'))
    }
    
}
