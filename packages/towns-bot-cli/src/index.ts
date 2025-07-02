import minimist from 'minimist'
import { green, red, yellow, cyan } from 'picocolors'
import { init, TEMPLATES, type Template } from './modules/init.js'
import { update } from './modules/update.js'

export type Argv = typeof argv

const argv = minimist(process.argv.slice(2), {
    string: ['template'],
    boolean: ['help'],
    alias: {
        h: 'help',
        t: 'template',
    },
})

async function main() {
    const command = argv._[0]

    if (argv.help || !command) {
        showHelp()
        return
    }

    try {
        switch (command) {
            case 'init':
                await init(argv)
                break
            case 'update':
                await update(argv)
                break
            default:
                console.error(red(`Unknown command: ${command}`))
                showHelp()
                process.exit(1)
        }
    } catch (error) {
        console.error(red('Error:'), error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

function showHelp() {
    console.log(`
${cyan('towns-bot')} - CLI for creating and managing Towns Protocol bot projects

${yellow('Usage:')}
  towns-bot <command> [options]

${yellow('Commands:')}
  ${green('init')} [project-name]    Create a new bot project
  ${green('update')}                 Update @towns-protocol dependencies to latest versions

${yellow('Options:')}
  -t, --template <name>   Template to use:
${Object.entries(TEMPLATES)
    .map(
        ([key, template]: [string, Template]) =>
            `                            ${key} - ${template.description}`,
    )
    .join('\n')}
                          Default: quickstart
  -h, --help              Show this help message

${yellow('Examples:')}
  ${cyan('# Create a new bot project with the default template')}
  towns-bot init my-bot

  ${cyan('# Create an AI bot project')}
  towns-bot init my-ai-bot --template thread-ai

  ${cyan('# Update dependencies in current project')}
  towns-bot update
`)
}

main().catch((error) => {
    console.error(red('Unexpected error:'), error)
    process.exit(1)
})
