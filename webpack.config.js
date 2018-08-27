const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { VueLoaderPlugin } = require(`${process.cwd()}/node_modules/vue-loader`)
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const LayoutPlugin = require('./build/layout-plugin')
const merge = require('webpack-merge')

const config = require(process.env.MPA_CONFIG)
const { entry, htmlPlugins, splitChunks } = require('./build/parse-config')

const cwd = process.cwd()
const webpackConfig = config.webpackConfig || {}
let clientPath = webpackConfig.context || path.join(cwd, 'client')
const resolve = (...pathes) => path.resolve(clientPath, ...pathes)

const env = process.env.NODE_ENV
const isProd = env === 'production'
const project = process.env.PROJECT
const isCdn = !!process.env.IS_CDN

const styleLoader = isProd ? MiniCssExtractPlugin.loader : 'style-loader'
const publicPath = isCdn ? config.publicPath + '/' : `/`

module.exports = merge({

    // 构建模式，即对应的是开发或生产环境，值可能是development或production
    mode: isProd ? 'production' : 'development',

    // 入口文件
    entry,

    // 输出文件
    output: {

        // 打包项目目标路径
        path: path.resolve(cwd, 'dist'),

        publicPath,

        // 打包后的文件名，开发环境为*.js，生产环境为*-[8位hash码].js
        filename: `${project}/scripts/[name]${isProd ? '-[hash:8]' : ''}.js`,
    },

    module: {

        rules: [

            {
                test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 1024,
                    name: `${project}/images/[name].[hash:7].[ext]`,
                }
            },

            {
              test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
              loader: 'url-loader',
              options: {
                limit: 1024,
                name: `${project}/medias/[name].[hash:7].[ext]`,
              }
            },

            {
              test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
              loader: 'url-loader',
              options: {
                limit: 1024,
                name: `${project}/images/[name].[hash:7].[ext]`,
              }
            },

            {
                // vue 文件编译
                test: /\.vue$/,
                loaders: ['vue-loader'],
            },

            {
                // js 文件编译
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: ['env'],
                    plugins: [
                        ['transform-runtime', {
                            'helpers': false,
                            'polyfill': false,
                            'regenerator': true,
                            'moduleName': 'babel-runtime'
                        }],
                        ['transform-object-assign', {
                            polyfill: true
                        }],
                    ],
                }
            },

            {
                // css 文件编译
                test: /\.css$/,
                loaders: [styleLoader, 'css-loader'],
            },

            {
                // less 文件编译
                test: /\.less$/,
                exclude: path.resolve(cwd, 'node_modules'),
                loaders: [styleLoader, 'css-loader', 'less-loader'],
            },

            {
                // sass 文件编译
                test: /\.sc|ass$/,
                exclude: path.resolve(cwd, 'node_modules'),
                loaders: [styleLoader, 'css-loader', 'sass-loader'],
            },

        ],

    },

    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.json', '.jsx', '.css', '.vue'],

        alias: {
            '@': resolve('./'),
            '@base': publicPath,
        },        
    },

    // 开发环境使用source-map
    devtool: isProd ? false : 'source-map',

    devServer: {
        contentBase: path.resolve(cwd, 'dist'),
        watchContentBase: true,
        port: 8080,
        hot: true,
    },

    context: clientPath,

    // 代码编译目标环境
    target: 'web',

    // 编译时只展示错误信息
    stats: 'errors-only',

    plugins: [
        new VueLoaderPlugin(),
        ...htmlPlugins.map(options => new HtmlWebpackPlugin(options)),
        new LayoutPlugin(),
        new webpack.optimize.SplitChunksPlugin(),
        new webpack.HotModuleReplacementPlugin(),

        new webpack.DefinePlugin({
            'process.env': JSON.stringify(env),
        }),

    ].concat(isProd ? [
        new MiniCssExtractPlugin({
            filename: `${project}/css/[name]-[hash:8].css`,
        })
    ] : [
        new CopyWebpackPlugin([
            {
                from: path.resolve(cwd, 'static'),
                to: path.resolve('./dist/static'),
                ignore: ['.*']
            }
        ]),
    ]),

    optimization: {
        splitChunks,

        minimizer: [
            new UglifyJsPlugin(),
            new OptimizeCSSAssetsPlugin(),
        ],

        runtimeChunk: false,
    }

}, webpackConfig)
