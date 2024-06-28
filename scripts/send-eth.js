// this script uses the private key that is funded during the 4337 setup step (see servers/4337)
// to then fund the recipient address. Needed for funding xchain during local development startup
const ethers = require('ethers')

async function sendEther(recipientAddress) {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const privateKey = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

    const wallet = new ethers.Wallet(privateKey, provider)

    const toAddress = recipientAddress
    const amountToSend = ethers.utils.parseEther('0.1') // Amount in ETH

    const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountToSend,
    })

    console.log('Transaction Hash:', tx.hash)
    await tx.wait() // Wait for the transaction to be mined
    console.log('Transaction confirmed')
}

// Check if a recipient address is provided as an argument
if (process.argv.length !== 3) {
    console.error('Usage: node script.js <recipient_address>')
    process.exit(1)
}

const recipientAddress = process.argv[2]
sendEther(recipientAddress)
