import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { createSpaceDappAndUserops, generatePrivyWalletIfKey, waitForOpAndTx } from './utils'
import { Wallet, ContractFactory, Contract, ContractInterface } from 'ethers'
import MockERC721A from '@river-build/web3/src/MockERC721A'
import { MockERC1155 } from '@river-build/web3/src/MockERC1155'
import { vi } from 'vitest'
import * as tokenTypes from '../src/tokenTypes'

test('can transfer ERC-721 to given address', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    // this is the same as the anvil acct 0 private key and is used as the signing key for the bundler - its funded
    const bundlerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const bundlerWallet = new Wallet(bundlerKey).connect(alice)
    const factory = new ContractFactory(MockERC721A.abi, MockERC721A.bytecode.object, bundlerWallet)
    const nftFactory = await factory.deploy()
    await nftFactory.deployed()

    const nftContract = new Contract(nftFactory.address, MockERC721A.abi, bundlerWallet)

    let aaAddress = await userOpsAlice.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()
    aaAddress = aaAddress!
    const tx = await nftContract.mint(aaAddress, 1)
    await tx.wait()

    // confirm aa has 1 nft
    expect((await nftContract.balanceOf(aaAddress)).toNumber()).toBe(1)

    const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

    // MockERC721A supportsInterface() calls revert, so we can't check if it's an ERC721, so mocking that check
    vi.spyOn(tokenTypes, 'isERC721').mockImplementationOnce(() => Promise.resolve(true))

    const transferOp = await userOpsAlice.sendTransferAssetsOp(
        { contractAddress: nftContract.address, recipient: randomWallet.address, tokenId: '0' },
        alice.wallet,
    )
    await waitForOpAndTx(transferOp, alice)

    expect((await nftContract.balanceOf(aaAddress)).toNumber()).toBe(0)
    expect((await nftContract.balanceOf(randomWallet.address)).toNumber()).toBe(1)
})

test('can transfer ERC-1155 to given address', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    // this is the same as the anvil acct 0 private key and is used as the signing key for the bundler - its funded
    const bundlerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const bundlerWallet = new Wallet(bundlerKey).connect(alice)
    const factory = new ContractFactory(
        MockERC1155.abi as unknown as ContractInterface,
        MockERC1155.bytecode,
        bundlerWallet,
    )
    const nftFactory = await factory.deploy()
    await nftFactory.deployed()

    const nftContract = new Contract(
        nftFactory.address,
        MockERC1155.abi as unknown as ContractInterface,
        bundlerWallet,
    )

    let aaAddress = await userOpsAlice.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()
    aaAddress = aaAddress!
    const BRONZE_TOKEN_ID = 3
    const tx = await nftContract.mintBronze(aaAddress)
    await tx.wait()

    // confirm aa has 1 nft
    expect((await nftContract.balanceOf(aaAddress, BRONZE_TOKEN_ID)).toNumber()).toBe(1)

    const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

    vi.spyOn(tokenTypes, 'isERC1155').mockImplementationOnce(() => Promise.resolve(true))

    const transferOp = await userOpsAlice.sendTransferAssetsOp(
        {
            contractAddress: nftContract.address,
            recipient: randomWallet.address,
            tokenId: '3',
            quantity: 1,
        },
        alice.wallet,
    )
    await waitForOpAndTx(transferOp, alice)

    expect((await nftContract.balanceOf(aaAddress, BRONZE_TOKEN_ID)).toNumber()).toBe(0)
    expect((await nftContract.balanceOf(randomWallet.address, BRONZE_TOKEN_ID)).toNumber()).toBe(1)
})
