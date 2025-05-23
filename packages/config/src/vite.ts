import { defineConfig } from 'vite'
import { externalizeDeps } from 'vite-plugin-externalize-deps'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'

export type TownsLibViteConfigOptions = {
    /** Entry file, e.g. `./src/index.ts` */
    entry: string | Array<string>
    /** Source directory used for type generation, e.g. `./src` */
    srcDir: string
    /** Excluded from type generation, e.g. `[./src/tests]` */
    exclude?: Array<string>
    /** Directory where build output will be placed, e.g. `./dist` */
    outDir?: string
    /** Generate CJS output, defaults to `true` */
    cjs?: boolean
    /** Optional path to a custom tsconfig file, defaults to `./tsconfig.json` */
    tsconfigPath?: string
    /** Additional dependencies to externalize if not detected by `vite-plugin-externalize-deps` */
    externalDeps?: Array<string | RegExp>
    /** Hook called prior to writing each declaration file; allows to transform the content */
    beforeWriteDeclarationFile?: (filePath: string, content: string) => string
}

/**
 * @param {{content: string, extension: string}} params
 * @returns
 */
function ensureImportFileExtension({ content, extension }: { content: string; extension: string }) {
    // replace e.g. `import { foo } from './foo'` with `import { foo } from './foo.js'`
    content = content.replace(
        /(im|ex)port\s[\w{}/*\s,]+from\s['"](?:\.\.?\/)+?[^.'"]+(?=['"];?)/gm,
        `$&.${extension}`,
    )

    // replace e.g. `import('./foo')` with `import('./foo.js')`
    content = content.replace(/import\(['"](?:\.\.?\/)+?[^.'"]+(?=['"];?)/gm, `$&.${extension}`)
    return content
}

/**
 * @param {import('./index.js').Options} options
 * @returns {import('vite').UserConfig}
 */
export const townsLibViteConfig = (options: TownsLibViteConfigOptions) => {
    const outDir = options.outDir ?? 'dist'
    const cjs = options.cjs ?? true

    return defineConfig({
        plugins: [
            externalizeDeps({ include: options.externalDeps ?? [] }),
            tsconfigPaths({
                projects: options.tsconfigPath ? [options.tsconfigPath] : undefined,
            }),
            dts({
                outDir: `${outDir}/esm`,
                entryRoot: options.srcDir,
                include: options.srcDir,
                exclude: options.exclude,
                tsconfigPath: options.tsconfigPath,
                compilerOptions: {
                    module: 99, // ESNext
                    declarationMap: false,
                },
                beforeWriteFile: (filePath, content) => {
                    content = options.beforeWriteDeclarationFile?.(filePath, content) || content
                    return {
                        filePath,
                        content: ensureImportFileExtension({ content, extension: 'js' }),
                    }
                },
                afterDiagnostic: (diagnostics) => {
                    if (diagnostics.length > 0) {
                        console.error('Please fix the above type errors')
                        process.exit(1)
                    }
                },
            }),
            cjs
                ? dts({
                      outDir: `${outDir}/cjs`,
                      entryRoot: options.srcDir,
                      include: options.srcDir,
                      exclude: options.exclude,
                      tsconfigPath: options.tsconfigPath,
                      compilerOptions: {
                          module: 1, // CommonJS
                          declarationMap: false,
                      },
                      beforeWriteFile: (filePath, content) => {
                          content =
                              options.beforeWriteDeclarationFile?.(filePath, content) || content
                          return {
                              filePath: filePath.replace('.d.ts', '.d.cts'),
                              content: ensureImportFileExtension({
                                  content,
                                  extension: 'cjs',
                              }),
                          }
                      },
                      afterDiagnostic: (diagnostics) => {
                          if (diagnostics.length > 0) {
                              console.error('Please fix the above type errors')
                              process.exit(1)
                          }
                      },
                  })
                : undefined,
        ],
        build: {
            outDir,
            minify: false,
            sourcemap: true,
            lib: {
                entry: options.entry,
                formats: cjs ? ['es', 'cjs'] : ['es'],
                fileName: (format) => {
                    if (format === 'cjs') return 'cjs/[name].cjs'
                    return 'esm/[name].js'
                },
            },
            rollupOptions: {
                output: {
                    preserveModules: true,
                },
            },
        },
    })
}
