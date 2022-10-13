/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { registerAndStartClients } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { TestConstants } from './helpers/TestConstants'

describe('councilNFTContract', () => {
    // usefull for debugging or running against cloud servers
    jest.setTimeout(30 * 1000)
    // test:
    test('interact with the council NFT contract', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // put some money in bob's account
        await bob.fundWallet()
        // call the contract
        const allowListMint = await bob.councilNFT.unsigned.allowlistMint()
        expect(allowListMint).toBeTruthy()
        // re-create one of the funded anvil wallets that we minted to in the deploy script
        const fundedWallet = TestConstants.FUNDED_WALLET_0
        // get the balance
        const balance = await bob.councilNFT.unsigned.balanceOf(fundedWallet.address)
        try {
            // mint
            const receipt = await bob.councilNFT.signed.mint(bob.provider.wallet.address)
            // log our our transaction
            console.log('receipt', receipt)
        } catch (error) {
            expect((error as Error).message).toContain('Public minting is not allowed yet')
        }
        // check the balence (did the mint work?)
        expect(balance.toNumber()).toBe(1)
    }) // end test
}) // end describe
