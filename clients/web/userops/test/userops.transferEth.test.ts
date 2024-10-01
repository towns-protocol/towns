import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { createSpaceDappAndUserops, generatePrivyWalletIfKey, waitForOpAndTx } from './utils'
import { Wallet, utils } from 'ethers'

test('can transfer eth to given address', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    // this is the same as the anvil acct 0 private key and is used as the signing key for the bundler - its funded
    const bundlerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const bundlerWallet = new Wallet(bundlerKey).connect(alice)

    let aaAddress = await userOpsAlice.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()
    aaAddress = aaAddress!

    const tx = await bundlerWallet.sendTransaction({ to: aaAddress, value: utils.parseEther('1') })
    await tx.wait()

    expect(utils.formatEther(await alice.getBalance(aaAddress))).toBe('1.0')

    const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

    const transferOp = await userOpsAlice.sendTransferEthOp(
        { recipient: randomWallet.address, value: utils.parseEther('0.3') },
        alice.wallet,
    )

    await waitForOpAndTx(transferOp, alice)

    expect(utils.formatEther(await alice.getBalance(randomWallet.address))).toBe('0.3')
})

test('can transfer max eth to given address', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    // this is the same as the anvil acct 0 private key and is used as the signing key for the bundler - its funded
    const bundlerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const bundlerWallet = new Wallet(bundlerKey).connect(alice)

    let aaAddress = await userOpsAlice.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()
    aaAddress = aaAddress!
    const _1Eth = utils.parseEther('1')

    const tx = await bundlerWallet.sendTransaction({ to: aaAddress, value: _1Eth })
    await tx.wait()

    expect(utils.formatEther(await alice.getBalance(aaAddress))).toBe('1.0')

    const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

    const transferOp = await userOpsAlice.sendTransferEthOp(
        { recipient: randomWallet.address, value: _1Eth },
        alice.wallet,
    )

    await waitForOpAndTx(transferOp, alice)
    const randomWalletBalance = await alice.getBalance(randomWallet.address)

    const lowerBound = utils.parseEther('0.9999')
    const upperBound = utils.parseEther('1')

    expect(randomWalletBalance.gte(lowerBound)).toBe(true)
    expect(randomWalletBalance.lte(upperBound)).toBe(true)
})
