/**
 * @group with-entitlements
 */
import { Bot } from '../../../sync-agent/utils/bot'
import type { Myself } from '../../../sync-agent/members/models/myself'

describe('member.test.ts', () => {
    let bob: Myself
    beforeAll(async () => {
        const bobUser = new Bot()
        await bobUser.fundWallet()
        const sync = await bobUser.makeSyncAgent()
        await sync.start()
        const { spaceId } = await sync.spaces.createSpace(
            {
                spaceName: 'test metadata',
            },
            bobUser.signer,
        )
        const space = sync.spaces.getSpace(spaceId)
        bob = space.members.myself
    })

    test('update username', async () => {
        expect(bob).toBeDefined()
        expect(bob.username).toBe('')
        await bob.setUsername('bob123')
        expect(bob.username).toBe('bob123')
    })
    test('update displayname', async () => {
        expect(bob.displayName).toBe('')
        await bob.setDisplayName('Bob')
        expect(bob.displayName).toBe('Bob')
    })
    test('update ensAddress', async () => {
        expect(bob.ensAddress).toBe(undefined)
        await bob.setEnsAddress('0xbB29f0d47678BBc844f3B87F527aBBbab258F051')
        expect(bob.ensAddress).toBe('0xbB29f0d47678BBc844f3B87F527aBBbab258F051')
    })
    test('update nft', async () => {
        expect(bob.nft).toBe(undefined)
        const miladyNft = {
            tokenId: '1043',
            contractAddress: '0x5af0d9827e0c53e4799bb226655a1de152a425a5',
            chainId: 1,
        }
        await bob.setNft(miladyNft)
        expect(bob.nft).toStrictEqual(miladyNft)
    })
})
