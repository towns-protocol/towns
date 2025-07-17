import { generateWalletsFromSeed } from './utils/wallets'

function printUsage() {
    console.log(`
Usage: yarn generate-wallets --seed "<seed phrase>" --start <number> --end <number>

Options:
  --seed    The mnemonic seed phrase (required)
  --start   Starting wallet index (default: 0)
  --end     Ending wallet index (default: 10)
  --help    Show this help message

Example:
  yarn generate-wallets --seed "test test test test test test test test test test test junk" --start 0 --end 5
`)
}

function parseArgs(): { seed?: string; start: number; end: number; help: boolean } {
    const args = process.argv.slice(2)
    const result = {
        seed: undefined as string | undefined,
        start: 0,
        end: 10,
        help: false,
    }

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--seed':
                result.seed = args[++i]
                break
            case '--start':
                result.start = parseInt(args[++i], 10)
                break
            case '--end':
                result.end = parseInt(args[++i], 10)
                break
            case '--help':
                result.help = true
                break
        }
    }

    return result
}

async function main() {
    const { seed, start, end, help } = parseArgs()

    if (help) {
        printUsage()
        process.exit(0)
    }

    if (!seed) {
        console.error('Error: --seed is required')
        printUsage()
        process.exit(1)
    }

    if (isNaN(start) || isNaN(end)) {
        console.error('Error: --start and --end must be valid numbers')
        printUsage()
        process.exit(1)
    }

    if (start < 0 || end < 0) {
        console.error('Error: --start and --end must be non-negative')
        process.exit(1)
    }

    if (start > end) {
        console.error('Error: --start must be less than or equal to --end')
        process.exit(1)
    }

    try {
        console.log(`Generating wallets from index ${start} to ${end - 1}...\n`)

        const wallets = generateWalletsFromSeed(seed, start, end)

        console.log(`Generated ${wallets.length} wallet(s):\n`)

        wallets.forEach((wallet, index) => {
            console.log(`Wallet #${start + index}:`)
            console.log(`  Address: ${wallet.address}`)
            console.log(`  Private Key: ${wallet.privateKey}`)
            console.log()
        })
    } catch (error) {
        console.error('Error generating wallets:', error)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
})
