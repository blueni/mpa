const build = require('./build.js')
const inquirer = require('inquirer')
const { entryes } = require(process.env.MPA_CONFIG)
const isProd = process.env.NODE_ENV === 'production'
let [, , task] = process.argv
let projects

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

function runProject(){
    if(!projectExisits()){
        throw new Error(`${projectName}项目不存在`)
    }
    process.env.PROJECT = projectName
    
    const buildProjects = () => {
        process.env.PROJECT = projects.shift()
        return build().then(() => {
            if(projects.length){
                return buildProjects()
            }
            if(task === 'publish'){
                require('./publish.js')(projectName.split('__'))
            }
        })
    }

    // 构建时分开打包则每个项目的公共js文件不至于太大，开发时则无所谓了...
    isProd ? buildProjects() : build().then(process.exit)
}
