/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { registerAndStartClients } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { TestConstants } from './helpers/TestConstants'

describe('councilNFTContract', () => {
    // usefull for debugging or running against cloud servers
    // test:
    test('interact with the council NFT contract', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // put some money in bob's account
        await bob.fundWallet()
        // call the contract
        if (!bob.councilNFT) {
            throw new Error('No council NFT contract')
        }
        const allowListMint = await bob.councilNFT.read.allowlistMint()
        expect(allowListMint).toBeTruthy()
        // re-create one of the funded anvil wallets that we minted to in the deploy script
        const fundedWallet = TestConstants.getWalletWithNft()
        // get the balance
        const balance = await bob.councilNFT.read.balanceOf(fundedWallet.address)
        try {
            // mint
            const receipt = await bob.councilNFT.write.mint(bob.provider.wallet.address)
            // log our our transaction
            console.log('receipt', receipt)
        } catch (error) {
            expect((error as Error).message).toContain('Public minting is not allowed yet')
        }
        // check the balence (did the mint work?)
        expect(balance.toNumber()).toBe(1)
    }) // end test
}) // end describe
