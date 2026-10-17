const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

/**
 * Builds one self-contained bundle per tool. The JSP shells under src/main/resources/tools load them from
 * /modules/jahia-super-tools/javascript/apps/<name>.bundle.js (a Jahia-Static-Resources folder, served without auth).
 */
module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    return {
        mode,
        entry: {
            cacheBrowser: path.resolve(__dirname, 'src/javascript/cache-browser/index.jsx'),
            jcrBrowser: path.resolve(__dirname, 'src/javascript/jcr-browser/index.jsx'),
            beanEditor: path.resolve(__dirname, 'src/javascript/bean-editor/index.jsx')
        },
        output: {
            path: path.resolve(__dirname, 'src/main/resources/javascript/apps/'),
            filename: '[name].bundle.js',
            chunkFilename: '[name].[contenthash:8].chunk.js',
            publicPath: 'auto',
            clean: true
        },
        resolve: {
            extensions: ['.mjs', '.js', '.jsx', '.json']
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    resolve: {fullySpecified: false}
                },
                {
                    test: /\.jsx?$/,
                    include: [path.join(__dirname, 'src/javascript')],
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {modules: false, targets: 'defaults'}],
                                ['@babel/preset-react', {runtime: 'automatic'}]
                            ]
                        }
                    }
                },
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader']
                }
            ]
        },
        plugins: [new CleanWebpackPlugin({verbose: false})],
        devtool: mode === 'production' ? false : 'eval-source-map',
        performance: {hints: false}
    };
};
