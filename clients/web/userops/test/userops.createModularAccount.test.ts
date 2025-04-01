import { createSmartAccountClient } from 'permissionless'
import {
    createPublicClient,
    createTestClient,
    http,
    isAddress,
    parseEther,
    zeroAddress,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import { toModularSmartAccount } from '../src/lib/permissionless/accounts/modular/toModularAccount'
import { determineSmartAccount } from '../src/lib/permissionless/accounts/determineSmartAccount'

// verify local deployments of modular account factory and modular account implementation
test('can create modular smart account', async () => {
    const publicClient = createPublicClient({
        chain: foundry,
        transport: http(process.env.AA_RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    const smartAccount = await determineSmartAccount({
        ownerAddress: owner.address,
        newAccountImplementationType: 'modular',
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const modularAccount = await toModularSmartAccount({
        client: publicClient,
        owner,
        address: smartAccount.address,
    })

    const smartAccountClient = createSmartAccountClient({
        account: modularAccount,
        chain: foundry,
        bundlerTransport: http(process.env.AA_BUNDLER_URL),
    })

    expect(
        isAddress(smartAccountClient.account.address) &&
            smartAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const anvilClient = createTestClient({
        transport: http(process.env.AA_RPC_URL),
        mode: 'anvil',
    })

    await anvilClient.setBalance({
        address: smartAccountClient.account.address,
        value: parseEther('1000'),
    })

    expect(await publicClient.getBalance({ address: smartAccountClient.account.address })).toBe(
        parseEther('1000'),
    )

    const gasFees = await publicClient.estimateFeesPerGas()
    const tx = await smartAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther('1'),
            },
        ],
        maxFeePerGas: gasFees.maxFeePerGas,
        maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas,
    })

    const useropReceipt = await smartAccountClient.waitForUserOperationReceipt({ hash: tx })
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    expect(receipt?.status).toBe('success')
})
