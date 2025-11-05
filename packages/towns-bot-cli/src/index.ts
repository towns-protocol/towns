import { green, red, yellow, cyan } from 'picocolors'
import { init, TEMPLATES, type Template } from './modules/init.js'
import { update } from './modules/update.js'
import { uploadPfp } from './modules/upload-pfp.js'
import { parseArgs, isInitArgs, isUpdateArgs, isUploadPfpArgs } from './parser.js'

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const command = args._[0]

    if (args.help || !command) {
        showHelp()
        return
    }

    try {
        switch (command) {
            case 'init':
                if (isInitArgs(args)) {
                    await init(args)
                }
                break
            case 'update':
                if (isUpdateArgs(args)) {
                    await update(args)
                }
                break
            case 'upload-pfp':
                if (isUploadPfpArgs(args)) {
                    await uploadPfp(args)
                }
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
  ${green('init')} [project-name]     Create a new bot project
  ${green('update')}                  Update @towns-protocol dependencies to latest versions
  ${green('upload-pfp')} <image-path> Upload a profile picture for the bot user

${yellow('Init Options:')}
  -t, --template <name>    Template to use:
${Object.entries(TEMPLATES)
    .map(
        ([key, template]: [string, Template]) =>
            `                             ${key} - ${template.description}`,
    )
    .join('\n')}
                           Default: quickstart

${yellow('List Commands Options:')}
  -f, --file <path>        Path to commands file

${yellow('Update Commands Options:')}
  -f, --file <path>         Path to commands file
  -t, --bearerToken <token>  Bearer token for authentication
  -e, --envFile <path>       Path to .env file (default: .env)

${yellow('Global Options:')}
  -h, --help               Show this help message

${yellow('Examples:')}
  ${cyan('# Create a new bot project')}
  towns-bot init my-bot
  towns-bot init my-ai-bot --template quickstart

  ${cyan('# Update dependencies')}
  towns-bot update

  ${cyan('# Upload a profile picture')}
  towns-bot upload-pfp ./avatar.png
`)
}

main().catch((error) => {
    console.error(red('Unexpected error:'), error)
    process.exit(1)
})
