const ssh = require('./publish.config')

module.exports = {
    staticPath: 'static',                         // 项目静态文件夹目录
    publicPath: '/',                              // 静态文件基本路径，使用CDN时该配置才会生效
    jsBase: 'scripts',                            // 基本js路径
    htmlBase: 'pages',                            // 基本html路径
    styleBase: 'styles',                          // 基本样式路径（暂时没有用上...）
    delimiter: '?',                               // 模板引擎识别字符,模板中的<? ?>标签对里的内容将被ejs编译
    watchForRestartWebpack: [                     // 检测文件变动时需要重启webpack-dev-server的文件或目录
        'client/templates/'
    ],

    ssh,                                          // 发布到远程服务器
    
    webpackConfig: {                              // webpack配置
    },

    entryes: [                                    // 子项目数组
        {
            name: 'index',                        // 子顶目名称
            description: 'index',                 // 子项目描述
            title:"mpa index",                    // 统一设置子项目页面标题
            jsBase: 'scripts/index',              // 统一设置子项目页面js基本路径
            htmlBase: 'pages/index',              // 统一设置子项目页面html基本路径
            layoutFile: 'templates/layout.html',  // 统一设置子项目页面layout布局
            items: [ 
                {
                    jsEntry: 'index.js',          // js入口文件
                    template: 'index.html',       // html模板文件
                    data: {                       // 传入到模板文件的数据
                        nav: 'index',
                    },
                },
            ]
        },

        {
            name: 'uc',
            description: '用户中心',
            jsBase: 'scripts/uc',
            htmlBase: 'pages/uc',
            title:"用户中心 - mpa",
            layoutFile: 'templates/layout.html',
            items: [   
                {
                    jsEntry: 'uc.js',
                    template: 'index.html',
                    data: {
                        nav: 'uc',
                    },
                },
            ]
        },
        
    ],
    
}
