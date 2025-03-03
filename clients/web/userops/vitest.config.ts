// vitest.config.ts
import { defineConfig } from 'vitest/config'

// see vitest.workspace.ts for the actual config
export default defineConfig({
    test: {
        exclude: ['node_modules', 'dist'],
    },
})
