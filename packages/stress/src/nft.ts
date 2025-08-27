/* eslint-disable no-console */
import { ethers } from 'ethers'

// ERC721A ABI - only including the functions we need
const ERC721A_ABI = [
    'function safeTransferFrom(address from, address to, uint256 tokenId) external',
    'function ownerOf(uint256 tokenId) view returns (address)',
] as const

interface NFTOptions {
    rpcUrl: string
    contract?: string
    tokenId?: number
    from?: string
    to?: string
    privateKey?: string
}

function printUsage() {
    console.log(`
Usage: pnpm nft <command> [options]

Commands:
  check     Check owner of an NFT
  transfer  Transfer an NFT between wallets

Options:
  --contract <address>  NFT contract address (required)
  --token-id <number>   NFT token ID (required)
  --from <address>      From address (required for transfer)
  --to <address>        To address (required for transfer)
  --private-key <key>   Private key (required for transfer)
  --rpc-url <url>       RPC URL (default: https://sepolia.base.org)
  --help                Show this help message

Examples:
  # Check NFT owner
  pnpm nft check --contract 0x789... --token-id 7

  # Transfer NFT
  pnpm nft transfer --from 0x123... --to 0x456... --contract 0x789... --token-id 7 --private-key 0x...
`)
}

function parseArgs(): {
    command?: string
    options: NFTOptions
    help: boolean
} {
    const args = process.argv.slice(2)
    const command = args[0]
    const options: NFTOptions = {
        rpcUrl: 'https://sepolia.base.org',
    }
    let help = false

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--contract':
                options.contract = args[++i]
                break
            case '--token-id':
                options.tokenId = parseInt(args[++i], 10)
                break
            case '--from':
                options.from = args[++i]
                break
            case '--to':
                options.to = args[++i]
                break
            case '--private-key':
                options.privateKey = args[++i]
                break
            case '--rpc-url':
                options.rpcUrl = args[++i]
                break
            case '--help':
                help = true
                break
        }
    }

    return { command, options, help }
}

async function checkOwner(options: NFTOptions) {
    if (!options.contract || options.tokenId === undefined) {
        throw new Error('Contract and tokenId are required')
    }

    const provider = new ethers.providers.JsonRpcProvider(options.rpcUrl)
    const contract = new ethers.Contract(options.contract, ERC721A_ABI, provider)

    console.log(`Checking owner of token #${options.tokenId}...`)
    console.log(`Contract: ${options.contract}`)
    console.log(`RPC URL: ${options.rpcUrl}\n`)

    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const owner: string = (await contract.ownerOf(options.tokenId)) as string
        console.log(`Token #${options.tokenId} owner: ${owner}`)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
    }
}

async function transferNFT(options: NFTOptions) {
    if (
        !options.contract ||
        options.tokenId === undefined ||
        !options.from ||
        !options.to ||
        !options.privateKey
    ) {
        throw new Error('Contract, tokenId, from, to, and privateKey are required')
    }

    const provider = new ethers.providers.JsonRpcProvider(options.rpcUrl)
    const wallet = new ethers.Wallet(options.privateKey, provider)

    console.log('Connected to:', options.rpcUrl)
    console.log('Using wallet:', wallet.address)

    // Create contract instance
    const nftContract = new ethers.Contract(options.contract, ERC721A_ABI, wallet)

    try {
        // Check current owner
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const currentOwner: string = (await nftContract.ownerOf(options.tokenId)) as string
        console.log(`\nToken #${options.tokenId} current owner: ${currentOwner}`)

        if (currentOwner.toLowerCase() !== options.from.toLowerCase()) {
            console.error(`Error: Token #${options.tokenId} is not owned by ${options.from}`)
            process.exit(1)
        }

        // Perform the transfer
        console.log(`\nTransferring token #${options.tokenId}...`)
        console.log(`From: ${options.from}`)
        console.log(`To: ${options.to}`)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const tx: ethers.ContractTransaction = (await nftContract.safeTransferFrom(
            options.from,
            options.to,
            options.tokenId,
        )) as ethers.ContractTransaction

        console.log(`\nTransaction hash: ${tx.hash}`)
        console.log('Waiting for confirmation...')

        const receipt: ethers.ContractReceipt = await tx.wait()
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`)

        // Wait a moment for state to update
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Verify new owner
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const newOwner: string = (await nftContract.ownerOf(options.tokenId)) as string
        console.log(`\nToken #${options.tokenId} new owner: ${newOwner}`)

        if (newOwner.toLowerCase() === options.to.toLowerCase()) {
            console.log('✅ Transfer successful!')
        } else {
            console.log('⚠️  Transfer completed but ownership verification shows unexpected owner')
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
    }
}

async function main() {
    const { command, options, help } = parseArgs()

    if (help || !command) {
        printUsage()
        process.exit(0)
    }

    try {
        if (command === 'check') {
            if (!options.contract || options.tokenId === undefined) {
                console.error('Error: --contract and --token-id are required for check command')
                printUsage()
                process.exit(1)
            }

            await checkOwner(options)
        } else if (command === 'transfer') {
            if (
                !options.contract ||
                options.tokenId === undefined ||
                !options.from ||
                !options.to ||
                !options.privateKey
            ) {
                console.error(
                    'Error: --contract, --token-id, --from, --to, and --private-key are required for transfer',
                )
                printUsage()
                process.exit(1)
            }

            await transferNFT(options)
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
