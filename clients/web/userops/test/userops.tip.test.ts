import { Address, ETH_ADDRESS, LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { ethers } from 'ethers'

test('can send tip to space member', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_2),
    )
    await bob.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
    const { userOps: userOpsBob } = await createSpaceDappAndUserops(bob)

    // Create space
    const createSpaceOp = await createUngatedSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, alice.wallet.address, userOpsAlice)

    const bobAAAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })
    expect(bobAAAddress).toBeDefined()

    // Bob joins space - mint to membershipnft
    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bobAAAddress!, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, bobAAAddress!)
    expect(bobMembership).toBe(true)

    const aliceAAAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aliceAAAddress).toBeDefined()

    const receipt = await fundWallet(aliceAAAddress!, alice)
    expect(receipt?.status).toBe(1)

    const aliceBalance = await alice.getBalance(aliceAAAddress!)
    expect(aliceBalance.toBigInt()).toBe(1000000000000000000n)

    expect((await bob.getBalance(bobAAAddress!)).toBigInt()).toBe(0n)

    // Alice tips Bob
    const tipAmount = ethers.utils.parseEther('0.01').toBigInt()
    const messageId = '0x' + '1'.repeat(64)
    const channelId = '0x' + '2'.repeat(64)
    const space = spaceDapp.getSpace(spaceId)

    const tokenId = await spaceDapp.getTokenIdOfOwner(spaceId, bobAAAddress!, {
        supportedRpcUrls: [],
        etherNativeNetworkIds: [],
        ethereumNetworkIds: [],
    })

    const tipOp = await userOpsAlice.sendTipOp([
        {
            spaceId,
            receiver: bobAAAddress!,
            tokenId: tokenId!,
            currency: ETH_ADDRESS,
            amount: tipAmount,
            messageId,
            channelId,
        },
        alice.wallet,
    ])

    await waitForOpAndTx(tipOp, alice)
    await sleepBetweenTxs()

    expect((await bob.getBalance(bobAAAddress!)).toBigInt()).toBeGreaterThan(0)
    const bobBalanceInAAAfterTip1 = await bob.getBalance(bobAAAddress!)

    // now bob will link a wallet
    const metamaskWallet = ethers.Wallet.createRandom().connect(spaceDapp.provider)
    const metamaskAddress = await metamaskWallet.getAddress()

    const linkOp = await userOpsBob.sendLinkEOAToRootKeyOp([bob.wallet, metamaskWallet])
    await waitForOpAndTx(linkOp, bob)
    await sleepBetweenTxs()

    const bobWallets = await spaceDapp.walletLink.getLinkedWallets(bob.wallet.address)
    expect(bobWallets).toContain(metamaskAddress)

    expect(space).toBeDefined()
    // now bob is gonna send the membership nft to his other wallet

    const transferOp = await userOpsBob.sendTransferAssetsOp(
        {
            contractAddress: space!.Membership.address,
            recipient: metamaskAddress,
            tokenId: '1',
        },
        bob.wallet,
    )

    await waitForOpAndTx(transferOp, bob)
    await sleepBetweenTxs()

    const balanceOfNft = await space!.ERC721A.read.balanceOf(metamaskAddress)
    expect(balanceOfNft.toBigInt()).toBe(1n)

    const metamaskMembership = await spaceDapp.hasSpaceMembership(spaceId, metamaskAddress)
    expect(metamaskMembership).toBe(true)

    // now tip bob again - to his metamask
    await fundWallet(aliceAAAddress!, alice)
    const tokenId2 = await spaceDapp.getTokenIdOfOwner(spaceId, bobAAAddress!, {
        supportedRpcUrls: [],
        etherNativeNetworkIds: [],
        ethereumNetworkIds: [],
    })

    // specify metamask as receiver
    const tipOp2 = await userOpsAlice.sendTipOp([
        {
            spaceId,
            receiver: metamaskAddress,
            tokenId: tokenId2!,
            currency: ETH_ADDRESS,
            amount: tipAmount,
            messageId,
            channelId,
        },
        alice.wallet,
    ])

    await waitForOpAndTx(tipOp2, alice)
    await sleepBetweenTxs()

    const bobBalanceInAAAfterTip2 = await bob.getBalance(bobAAAddress!)
    // bob should have the same exsiting tip amount in his AA address, since the tip was sent to metamask
    expect(bobBalanceInAAAfterTip2.toBigInt()).toBe(bobBalanceInAAAfterTip1.toBigInt())

    // bob should have the tip amount in his metamask address
    expect((await bob.getBalance(metamaskAddress)).toBigInt()).toBeGreaterThan(0)
    const metamaskBalanceAfterTip2 = await bob.getBalance(metamaskAddress)

    // tip bob again. The membership NFT is in his metamask, but we want to tip his AA address
    await fundWallet(aliceAAAddress!, alice)
    const tokenId3 = await spaceDapp.getTokenIdOfOwner(spaceId, bobAAAddress!, {
        supportedRpcUrls: [],
        etherNativeNetworkIds: [],
        ethereumNetworkIds: [],
    })

    const tipOp3 = await userOpsAlice.sendTipOp([
        {
            spaceId,
            receiver: bobAAAddress!,
            tokenId: tokenId3!,
            currency: ETH_ADDRESS,
            amount: tipAmount,
            messageId,
            channelId,
        },
        alice.wallet,
    ])

    await waitForOpAndTx(tipOp3, alice)
    await sleepBetweenTxs()

    expect((await bob.getBalance(bobAAAddress!)).toBigInt()).toBeGreaterThan(
        bobBalanceInAAAfterTip2.toBigInt(),
    )
    expect((await bob.getBalance(metamaskAddress)).toBigInt()).toBe(
        metamaskBalanceAfterTip2.toBigInt(),
    )
})
