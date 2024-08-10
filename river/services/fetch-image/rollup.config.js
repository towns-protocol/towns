import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import url from '@rollup/plugin-url'
import wasm from '@rollup/plugin-wasm'

export default {
	treeshake: 'smallest',
	input: 'src/node.ts',
	output: {
		entryFileNames: 'node_rollup.js',
		dir: 'dist',
		format: 'esm',
		sourcemap: 'inline',
	},
	plugins: [
		replace({
			'process.env.NODE_ENV': JSON.stringify('production'),
			preventAssignment: true,
		}),
		resolve({
			preferBuiltins: true,
		}),
		commonjs({
			dynamicRequireTargets: [
				// include files that dynamically require modules
				'node_modules/@river-build/encryption/dist/encryptionDelegate.js',
			],
			ignoreDynamicRequires: false,
		}),
		json(),
		url({
			include: ['**/*.wasm'], // Handle .wasm files
			limit: 0, // Always embed the file as a URL
			publicPath: '', // Customize this as needed
		}),
		wasm(),
		typescript({
			tsconfig: './tsconfig.json',
		}),
	],
	external: ['fs', 'path', 'os', 'events', 'crypto', 'stream', 'util'],
}
