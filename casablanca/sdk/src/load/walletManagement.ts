// eslint-disable-next-line import/no-extraneous-dependencies
import { createPublicClient, createWalletClient, http } from 'viem'
// eslint-disable-next-line import/no-extraneous-dependencies
import { baseSepolia } from 'wagmi/chains'
// eslint-disable-next-line import/no-extraneous-dependencies
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { jsonRpcProviderUrl, minimalBalance } from './loadconfig'
import { dlog } from '@river/waterproof'
import { isValidEthAddress } from '../util.test'

const transport = http(jsonRpcProviderUrl)

const log = dlog('csb:test:walletManagement')

type Hex = `0x${string}`

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: transport,
})

export const createAccount = (numberOfAccounts: number = 1) => {
    const accounts = []

    for (let i = 0; i < numberOfAccounts; i++) {
        const privateKey = generatePrivateKey()
        const account = privateKeyToAccount(privateKey)
        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: transport,
        })

        log('walletClient.account.address:', walletClient.account.address)
        const newAccount = { address: account.address, privateKey: privateKey }
        log('newAccount:', newAccount)
        accounts.push(newAccount)
    }

    return accounts
}

export async function getBalance(address: string): Promise<bigint> {
    if (!isValidEthAddress(address)) {
        throw new Error('Invalid Ethereum address format')
    }

    const balance = await publicClient.getBalance({ address: address as Hex })
    return balance
}

export async function deposit(
    fromAccount: {
        address: string
        privateKey: string
    },
    toAddress: string,
    ethAmount: number = minimalBalance,
): Promise<void> {
    if (!isValidEthAddress(toAddress)) {
        throw new Error('Invalid Ethereum address format')
    }

    let privateKey = fromAccount.privateKey
    if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey
    }

    const account = privateKeyToAccount(privateKey as Hex)
    const walletClient = createWalletClient({
        account: account,
        chain: baseSepolia,
        transport: transport,
    })
    const weiValue = BigInt(ethAmount * 1e18)

    const receipt = await walletClient.sendTransaction({
        account: account,
        to: toAddress as Hex,
        value: weiValue,
    })
    log(`Deposit to <${toAddress}>, receipt`, receipt)
}
