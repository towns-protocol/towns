/* eslint-disable no-console */
import { ethers } from 'ethers'
import { generateWalletsFromSeed } from './utils/wallets'

interface TransferOptions {
    oldSeed: string
    newSeed: string
    rpcUrl: string
    startIndex: number
    endIndex: number
    gasBuffer: number
    from?: string
    to?: string
    amount?: string
    privateKey?: string
}

function printUsage() {
    console.log(`
Usage: yarn transfer-funds <command> [options]

Commands:
  check     Check balances of wallets from old seed
  transfer  Transfer ETH from old seed wallets to new seed wallets
  send-gas  Send ETH from one wallet to another for gas fees

Options:
  --old-seed <phrase>      Old mnemonic seed phrase (required)
  --new-seed <phrase>      New mnemonic seed phrase (required for transfer)
  --rpc-url <url>          RPC URL (default: https://sepolia.base.org)
  --start <number>         Starting wallet index (default: 0)
  --end <number>           Ending wallet index (default: 40)
  --gas-buffer <percent>   Gas buffer percentage (default: 10)
  --from <address>         From address (for send-gas)
  --to <address>           To address (for send-gas)
  --amount <eth>           Amount in ETH (for send-gas)
  --private-key <key>      Private key (for send-gas)
  --help                   Show this help message

Examples:
  # Check balances
  yarn transfer-funds check --old-seed "your old seed phrase"

  # Transfer ETH between seed phrases
  yarn transfer-funds transfer --old-seed "old phrase" --new-seed "new phrase"

  # Send gas money
  yarn transfer-funds send-gas --from 0x123... --to 0x456... --amount 0.001 --private-key 0x...
`)
}

function parseArgs(): {
    command?: string
    options: Partial<TransferOptions>
    help: boolean
} {
    const args = process.argv.slice(2)
    const command = args[0]
    const options: Partial<TransferOptions> = {
        rpcUrl: 'https://sepolia.base.org',
        startIndex: 0,
        endIndex: 40,
        gasBuffer: 10,
    }
    let help = false

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--old-seed':
                options.oldSeed = args[++i]
                break
            case '--new-seed':
                options.newSeed = args[++i]
                break
            case '--rpc-url':
                options.rpcUrl = args[++i]
                break
            case '--start':
                options.startIndex = parseInt(args[++i], 10)
                break
            case '--end':
                options.endIndex = parseInt(args[++i], 10)
                break
            case '--gas-buffer':
                options.gasBuffer = parseInt(args[++i], 10)
                break
            case '--from':
                options.from = args[++i]
                break
            case '--to':
                options.to = args[++i]
                break
            case '--amount':
                options.amount = args[++i]
                break
            case '--private-key':
                options.privateKey = args[++i]
                break
            case '--help':
                help = true
                break
        }
    }

    return { command, options, help }
}

async function checkBalances(options: TransferOptions) {
    const provider = new ethers.providers.JsonRpcProvider(options.rpcUrl)
    const wallets = generateWalletsFromSeed(options.oldSeed, options.startIndex, options.endIndex)

    console.log(`Checking balances on ${options.rpcUrl}...\n`)

    let totalBalance = ethers.BigNumber.from(0)

    for (let i = 0; i < wallets.length; i++) {
        const address = wallets[i].address
        const balance = await provider.getBalance(address)
        totalBalance = totalBalance.add(balance)

        console.log(`Wallet #${options.startIndex + i}: ${address}`)
        console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH`)
    }

    console.log(
        `\nTotal balance across ${wallets.length} wallets: ${ethers.utils.formatEther(totalBalance)} ETH`,
    )
}

async function transferFunds(options: TransferOptions) {
    const provider = new ethers.providers.JsonRpcProvider(options.rpcUrl)

    // Generate wallets
    const oldWallets = generateWalletsFromSeed(
        options.oldSeed,
        options.startIndex,
        options.endIndex,
    )
    const newWallets = generateWalletsFromSeed(
        options.newSeed,
        options.startIndex,
        options.endIndex,
    )

    console.log('Starting fund transfers...\n')

    let successCount = 0
    let failCount = 0
    let totalTransferred = ethers.BigNumber.from(0)

    for (let i = 0; i < oldWallets.length; i++) {
        const signer = oldWallets[i].connect(provider)
        const oldAddress = oldWallets[i].address
        const newAddress = newWallets[i].address
        const walletIndex = options.startIndex + i

        try {
            // Get balance
            const balance = await provider.getBalance(oldAddress)
            console.log(`Wallet #${walletIndex}:`)
            console.log(`  From: ${oldAddress}`)
            console.log(`  To:   ${newAddress}`)
            console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH`)

            if (balance.gt(0)) {
                // Calculate gas price and estimate gas
                const gasPrice = await provider.getGasPrice()
                const gasLimit = 21000 // Standard ETH transfer
                const bufferMultiplier = 100 + options.gasBuffer
                const gasCost = gasPrice.mul(gasLimit).mul(bufferMultiplier).div(100)

                // Calculate amount to send (balance minus gas with buffer)
                const amountToSend = balance.sub(gasCost)

                if (amountToSend.gt(0)) {
                    console.log(`  Transferring ${ethers.utils.formatEther(amountToSend)} ETH...`)

                    const tx = await signer.sendTransaction({
                        to: newAddress,
                        value: amountToSend,
                        gasLimit: gasLimit,
                        gasPrice: gasPrice,
                    })

                    console.log(`  Transaction: ${tx.hash}`)
                    const receipt = await tx.wait()
                    console.log(`  Confirmed in block ${receipt.blockNumber}`)
                    successCount++
                    totalTransferred = totalTransferred.add(amountToSend)
                } else {
                    console.log(`  Insufficient balance to cover gas costs`)
                }
            } else {
                console.log(`  No balance to transfer`)
            }
            console.log()
        } catch (error) {
            console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            failCount++
            console.log()
        }
    }

    console.log('\nTransfer Summary:')
    console.log(`  Successful transfers: ${successCount}`)
    console.log(`  Failed transfers: ${failCount}`)
    console.log(`  Total transferred: ${ethers.utils.formatEther(totalTransferred)} ETH`)
}

async function sendGas(options: TransferOptions) {
    const provider = new ethers.providers.JsonRpcProvider(options.rpcUrl)
    const wallet = new ethers.Wallet(options.privateKey!, provider)

    console.log('Connected to:', options.rpcUrl)
    console.log('Sending from:', wallet.address)

    // Get balance
    const balance = await provider.getBalance(wallet.address)
    console.log('Current balance:', ethers.utils.formatEther(balance), 'ETH')

    // Convert amount to wei
    const amountWei = ethers.utils.parseEther(options.amount!)

    // Send transaction
    console.log(`\nSending ${options.amount} ETH to ${options.to}...`)

    const tx = await wallet.sendTransaction({
        to: options.to!,
        value: amountWei,
    })

    console.log(`Transaction hash: ${tx.hash}`)
    console.log('Waiting for confirmation...')

    const receipt = await tx.wait()
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`)

    // Check new balances
    const senderBalance = await provider.getBalance(options.from!)
    const receiverBalance = await provider.getBalance(options.to!)

    console.log('\nNew balances:')
    console.log(`Sender (${options.from}): ${ethers.utils.formatEther(senderBalance)} ETH`)
    console.log(`Receiver (${options.to}): ${ethers.utils.formatEther(receiverBalance)} ETH`)
}

async function main() {
    const { command, options, help } = parseArgs()

    if (help || !command) {
        printUsage()
        process.exit(0)
    }

    try {
        if (command === 'check') {
            if (!options.oldSeed) {
                console.error('Error: --old-seed is required for check command')
                printUsage()
                process.exit(1)
            }

            await checkBalances(options as TransferOptions)
        } else if (command === 'transfer') {
            if (!options.oldSeed || !options.newSeed) {
                console.error('Error: --old-seed and --new-seed are required for transfer command')
                printUsage()
                process.exit(1)
            }

            const startIndex = options.startIndex ?? 0
            const endIndex = options.endIndex ?? 40
            const gasBuffer = options.gasBuffer ?? 10

            if (isNaN(startIndex) || isNaN(endIndex) || isNaN(gasBuffer)) {
                console.error('Error: Invalid numeric values provided')
                process.exit(1)
            }

            if (startIndex < 0 || endIndex < 0) {
                console.error('Error: Start and end indices must be non-negative')
                process.exit(1)
            }

            if (startIndex > endIndex) {
                console.error('Error: Start index must be less than or equal to end index')
                process.exit(1)
            }

            const fullOptions: TransferOptions = {
                oldSeed: options.oldSeed,
                newSeed: options.newSeed,
                rpcUrl: options.rpcUrl ?? 'https://sepolia.base.org',
                startIndex,
                endIndex,
                gasBuffer,
            }

            console.log(
                '⚠️  WARNING: This will transfer all funds from old wallets to new wallets!',
            )
            console.log(`  RPC URL: ${fullOptions.rpcUrl}`)
            console.log(`  Wallet range: ${fullOptions.startIndex} to ${fullOptions.endIndex - 1}`)
            console.log(`  Gas buffer: ${fullOptions.gasBuffer}%`)
            console.log('\nPress Ctrl+C to cancel within 5 seconds...\n')

            await new Promise((resolve) => setTimeout(resolve, 5000))
            await transferFunds(fullOptions)
        } else if (command === 'send-gas') {
            if (!options.from || !options.to || !options.amount || !options.privateKey) {
                console.error(
                    'Error: --from, --to, --amount, and --private-key are required for send-gas',
                )
                printUsage()
                process.exit(1)
            }

            await sendGas(options as TransferOptions)
        } else {
            console.error(`Error: Unknown command '${command}'`)
            printUsage()
            process.exit(1)
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
})
