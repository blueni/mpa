#!/usr/bin/env node

const { start, init } = require('../index')

let [, , cmd, ...rest] = process.argv

switch (cmd) {
    case 'init':
        init()
        break
    
    case 'build':
    case 'publish':
        process.env.NODE_ENV = 'production'
        start()
        break

    default:
        start(cmd)
}
