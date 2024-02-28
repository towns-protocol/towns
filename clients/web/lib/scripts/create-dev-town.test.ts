/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { IArchitectBase, Permission } from '@river/web3'
import ethers from 'ethers'
import { ZionTestClient } from '../tests/integration/helpers/ZionTestClient'
import { Wallet } from 'ethers'
import fs from 'fs'

/**
 * This is not an actual test, it's just a quick hack to create a dev town.
 * We piggy back on jest's browser environment and a few test utils.
 *
 * - WARNING: Make sure ETHERS_NETWORK, CASABLANCA_SERVER_URL, WALLET_PRIVATE_KEY and CHAIN_ID env vars are set before running this jest script
 *
 * Workflow:
 * 1) Creates a zion test client with the provided private key from the environment
 * 2) Checks if the user is registered, if not, registers the user
 * 3) Creates a public dev town with the current month and day in the name (i.e Dev Town - October 27th)
 * 4) Writes the invite link to a file in the root of the project (inviteLink.txt)
 * 5) A different script can then read the invite link and post it to our slack and "latest-dev-town.towns.com"
 */

test('create dev town', async () => {
    // make sure ETHERS_NETWORK and CASABLANCA_SERVER_URL env vars are set before running this test
    // jest-setup.ts will provide default values for these env vars if they are not set
    // and they won't work for creating a town on the gamma environment.

    const { WALLET_PRIVATE_KEY, CHAIN_ID } = process.env

    if (!WALLET_PRIVATE_KEY) {
        throw new Error('WALLET_PRIVATE_KEY env var is not set')
    }

    if (!CHAIN_ID) {
        throw new Error('CHAIN_ID env var is not set')
    }

    const harmonyHotWallet = new ZionTestClient(
        parseInt(CHAIN_ID, 10),
        'harmonyHotWallet',
        undefined,
        new Wallet(WALLET_PRIVATE_KEY),
    )
    if (await harmonyHotWallet.isUserRegistered()) {
        await harmonyHotWallet.loginWalletAndStartClient()
    } else {
        await harmonyHotWallet.registerWalletAndStartClient()
    }
    // create a space
    const streamId = (await createDevTown(harmonyHotWallet))!
    const inviteLink = `https://app.gamma.towns.com/t/${streamId}/?invite`

    // export the invite link into a json file:

    fs.writeFileSync('inviteLink.txt', inviteLink)
}) // end test

export async function createDevTown(client: ZionTestClient): Promise<string | undefined> {
    if (!client.walletAddress) {
        throw new Error('client.walletAddress is undefined')
    }

    const membershipInfo: IArchitectBase.MembershipStruct = {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: client.walletAddress,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions: [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
        requirements: {
            everyone: true,
            tokens: [],
            users: [],
            rule: ethers.constants.AddressZero,
        },
    }

    const monthAndDay = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    return client.createSpace(
        {
            name: `Dev Town - ${monthAndDay}`,
        },
        membershipInfo,
    )
}
