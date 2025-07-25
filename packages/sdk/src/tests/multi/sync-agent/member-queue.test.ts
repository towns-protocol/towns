/**
 * @group with-entitlements
 */
import { Bot } from '../../../sync-agent/utils/bot'

describe('member.test.ts - queue update', () => {
    test('queue update metadata', async () => {
        const testMetadata = {
            username: 'bob123',
            displayName: 'Bob',
            ensAddress: '0xbB29f0d47678BBc844f3B87F527aBBbab258F051' as const,
            nft: {
                tokenId: '1043',
                contractAddress: '0x5af0d9827e0c53e4799bb226655a1de152a425a5',
                chainId: 1,
            },
        }
        const bobUser = new Bot()
        await bobUser.fundWallet()
        const bob = await bobUser.makeSyncAgent()
        let newSpaceId: string | undefined

        const updateAllMetadata = bob.spaces
            .createSpace(
                {
                    spaceName: 'test metadata',
                },
                bobUser.signer,
            )
            .then(({ spaceId }) => {
                newSpaceId = spaceId
                return bob.spaces.getSpace(spaceId)
            })
            .then((space) => {
                const metadata = space.members.myself

                return Promise.all([
                    metadata.setUsername(testMetadata.username),
                    metadata.setDisplayName(testMetadata.displayName),
                    metadata.setEnsAddress(testMetadata.ensAddress),
                    metadata.setNft(testMetadata.nft),
                ])
            })
        await bob.start()
        await expect(updateAllMetadata).resolves.toBeDefined()
        const msg = `expected SpaceId: ${newSpaceId} user: ${bob.userId} userStreamId: ${bob.riverConnection.client?.userStreamId}`
        expect(bob.spaces.data.spaceIds.length, msg).toBe(1)
        const spaceId = bob.spaces.data.spaceIds[0]
        expect(spaceId, msg).toBeDefined()
        expect(spaceId.length, msg).toBeGreaterThan(0)
        const space = bob.spaces.getSpace(spaceId)
        const member = space.members.get(bob.userId)
        expect(member?.username).toBe(testMetadata.username)
        expect(member?.displayName).toBe(testMetadata.displayName)
        expect(member?.ensAddress).toBe(testMetadata.ensAddress)
        expect(member?.nft).toStrictEqual(testMetadata.nft)
        await bob.stop()
    })
})
