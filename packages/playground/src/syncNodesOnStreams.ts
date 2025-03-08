import type { Hex } from 'viem'
import { createWalletClient, getContract, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import CONTRACT_ABI from '@river-build/generated/dev/abis/StreamRegistry.abi.ts'
import { towns } from '@river-build/web3/dist/chain.ts'

const PRIVATE_KEY: Hex = process.env.PRIVATE_KEY as Hex
const STREAM_REGISTRY_ADDRESS = '0x1298c03Fde548dc433a452573E36A713b38A0404'
const UPGRADE_BLOCK = 12635400n

// Configure your batch parameters
const BATCH_SIZE = 200n
const START_INDEX = 0n

const walletClient = createWalletClient({
    chain: towns,
    transport: http(),
    account: privateKeyToAccount(PRIVATE_KEY),
}).extend(publicActions)

const streamRegistry = getContract({
    address: STREAM_REGISTRY_ADDRESS,
    abi: CONTRACT_ABI,
    client: walletClient,
})

async function getNonce() {
    return walletClient.getTransactionCount({
        address: walletClient.account.address,
    })
}

async function main() {
    // Get the starting nonce from the network
    let nonce = await getNonce()
    console.log(`Starting nonce: ${nonce}`)

    const endIndex = await streamRegistry.read.getStreamCount({
        blockNumber: UPGRADE_BLOCK,
    })
    console.log(`Total streams: ${endIndex} at block ${UPGRADE_BLOCK}`)

    // Process each batch sequentially
    for (let currentStart = START_INDEX; currentStart < endIndex; currentStart += BATCH_SIZE) {
        const currentStop = currentStart + BATCH_SIZE
        console.log(
            `\nProcessing batch: start = ${currentStart}, stop = ${currentStop}, nonce = ${nonce}`,
        )

        try {
            // Send the transaction for the current batch with the manual nonce
            const txHash = await streamRegistry.write.syncNodesOnStreams([
                currentStart,
                currentStop,
            ])
            console.log(`Transaction sent: ${txHash}`)

            // Wait until the transaction is confirmed
            const receipt = await walletClient.waitForTransactionReceipt({
                hash: txHash,
            })
            console.log(`Transaction confirmed in block ${receipt.blockNumber}: ${txHash}`)

            // Increment the nonce for the next transaction
            nonce++
        } catch (error) {
            console.error(`Error processing batch from ${currentStart} to ${currentStop}:`, error)
            // Stop processing if a transaction fails (you can choose to continue if preferred)
            break
        }
    }

    console.log('\nAll batches processed.')
}

main().catch((error) => {
    console.error('Unexpected error:', error)
})
