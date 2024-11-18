import minimist from 'minimist'
import path from 'node:path'
import picocolors from 'picocolors'
import { getPackageManager, type CreateRiverBuildAppConfig, formatTargetDir } from './utils'
import { buildRiverReactApp } from './modules/react'

const argv = minimist<{
    template?: string
    help?: boolean
}>(process.argv.slice(2), {
    default: { help: false, template: 'react-ts' },
    alias: { h: 'help', t: 'template' },
    string: ['_'],
})

// prettier-ignore
const helpMessage = `\
Usage: create-river-build-app [OPTION]... [DIRECTORY]

Create a new River Build app.
With no arguments, creates a new app in the current directory.

Options:
  -t, --template NAME        use a specific template

Available templates:
${picocolors.yellow    ('react-ts       react'  )}
`

type Template = 'react-ts' | 'react'

const build = {
    'react-ts': buildRiverReactApp,
    react: buildRiverReactApp,
    // if you need a new template, add it here
} satisfies Record<Template, (cfg: CreateRiverBuildAppConfig) => Promise<void>>

async function init() {
    const targetDir = formatTargetDir(argv._[0]) || '.'
    const packageName = targetDir === '.' ? path.basename(process.cwd()) : targetDir
    const projectDir = targetDir === '.' ? process.cwd() : path.join(process.cwd(), targetDir)
    const pkgManager = getPackageManager()
    const template = ((argv.template || argv.t) ?? 'react-ts') as Template

    const help = argv.help
    if (help) {
        console.log(helpMessage)
        return
    }

    console.log(picocolors.blue(`\nScaffolding project in ${packageName}...`))
    await build[template]({
        projectDir,
        packageName,
        targetDir,
        viteTemplate: template,
    })
    console.log(picocolors.green('\nDone! 🎉'))
    console.log(picocolors.blue('\nNow run: cd ' + targetDir + ' && ' + pkgManager + ` install`))
    console.log(picocolors.blue('\nThen run: ' + pkgManager + ' dev'))
}

init().catch((e) => {
    console.error(e)
    process.exit(1)
})
