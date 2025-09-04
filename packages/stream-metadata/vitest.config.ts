import { defineConfig, mergeConfig } from 'vitest/config'
import { rootConfig, readBypassSecret } from '../../vitest.config.mjs'

export default mergeConfig(
	rootConfig,
	defineConfig({
		test: {
			include: ['tests/**/*.test.ts'],
			setupFiles: './vitest.setup.ts',
			env: {
				RIVER_ENV: 'local_dev',
				// skip entitlements for these tests
				RIVER_TEST_ENT_BYPASS_SECRET: readBypassSecret() ?? '',
			},
		},
	}),
)
