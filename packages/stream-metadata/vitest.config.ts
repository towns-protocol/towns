import { defineConfig, mergeConfig } from 'vitest/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { rootConfig } from '../../vitest.config.mjs'

function readBypassSecret(): string | undefined {
	try {
		const contractsPath = resolve(__dirname, `../../core/run_files/local_dev/contracts.env`)
		const content = readFileSync(contractsPath, 'utf8')
		const line = content
			.split(/\r?\n/)
			.find((l) => l.startsWith('RIVER_TESTENTITLEMENTSBYPASSSECRET='))
		if (line) return line.split('=', 2)[1]
	} catch {}
	return undefined
}

export default mergeConfig(
	rootConfig,
	defineConfig({
		test: {
			include: ['tests/**/*.test.ts'],
			setupFiles: './vitest.setup.ts',
			env: {
				RIVER_ENV: process.env.RIVER_ENV || 'local_multi',
				RIVER_TEST_ENT_BYPASS_SECRET: readBypassSecret() ?? '',
			},
		},
	}),
)
