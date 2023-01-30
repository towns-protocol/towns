const path = require('path')
//const { WranglerJsCompatWebpackPlugin } = require('wranglerjs-compat-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
	target: 'node',
	// ...
	entry: {
		bundle: path.join(__dirname, './src/index.ts'),
	},
	performance: {
		hints: 'warning',
	},
	output: {
		filename: 'bundle.js',
		path: path.join(__dirname, 'worker'),
	},
	watchOptions: {
		ignored: /node_modules|worker|\.js/g,
	},
	/*devtool: 'inline-source-map',*/
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	mode: process.env.NODE_ENV || 'development',
	resolve: {
		extensions: ['.js', '.ts'],
	},
	optimization: {
		emitOnErrors: false,
		minimize: true,
		minimizer: [new TerserPlugin()],
	},
}
