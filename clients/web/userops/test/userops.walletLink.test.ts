import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    generatePrivyWalletIfKey,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { ethers } from 'ethers'

test('can link a wallet with unfunded EOA', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)
    const metamaskWallet = ethers.Wallet.createRandom().connect(spaceDapp.provider)
    const metamaskAddress = await metamaskWallet.getAddress()

    const linkOp = await userOps.sendLinkEOAToRootKeyOp([alice.wallet, metamaskWallet])
    await waitForOpAndTx(linkOp, alice)
    await sleepBetweenTxs()

    let aliceWallets = await spaceDapp.walletLink.getLinkedWallets(alice.wallet.address)
    expect(aliceWallets).toContain(metamaskAddress)

    const unlinkOp = await userOps.sendRemoveWalletLinkOp([alice.wallet, metamaskWallet.address])
    await waitForOpAndTx(unlinkOp, alice)

    aliceWallets = await spaceDapp.walletLink.getLinkedWallets(alice.wallet.address)
    expect(aliceWallets).not.toContain(metamaskAddress)
})

test('can link a smart account', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const aliceAbstractAccountAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aliceAbstractAccountAddress).toBeDefined()

    const aaAddress = aliceAbstractAccountAddress!

    if (process.env.PRIVY_WALLET_PRIVATE_KEY_1) {
        if (
            (await spaceDapp.walletLink.getLinkedWallets(alice.wallet.address)).includes(aaAddress)
        ) {
            const unlinkOp = await userOps.sendRemoveWalletLinkOp([alice.wallet, aaAddress])
            await waitForOpAndTx(unlinkOp, alice)
            await sleepBetweenTxs()
        }
    }

    const linkOp = await userOps.sendLinkSmartAccountToRootKeyOp(alice.wallet)
    await waitForOpAndTx(linkOp, alice)
    await sleepBetweenTxs()

    let aliceWallets = await spaceDapp.walletLink.getLinkedWallets(alice.wallet.address)
    expect(aliceWallets).toContain(aaAddress)

    const unlinkOp = await userOps.sendRemoveWalletLinkOp([alice.wallet, aaAddress])
    await waitForOpAndTx(unlinkOp, alice)
    await sleepBetweenTxs()

    aliceWallets = await spaceDapp.walletLink.getLinkedWallets(alice.wallet.address)
    expect(aliceWallets).not.toContain(aaAddress)
})
