import { defineConfig } from 'vite'
import { townsLibViteConfig } from './src/vite'

export default defineConfig(
    townsLibViteConfig({
        entry: ['./src/vite.ts'],
        srcDir: './src',
        cjs: false,
    }),
)
