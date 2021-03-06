const path = require('path');
const serverlessWebpack = require('serverless-webpack');

module.exports = {
    entry: serverlessWebpack.lib.entries,
    target: 'node',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['env']
                        }
                    }
                ]
            }
        ]
    },
    output: {
        libraryTarget: 'commonjs2',
        path: path.resolve(__dirname, '.webpack'),
        filename: '[name].js'
    },
    externals: [
        'aws-sdk'
    ]
};
