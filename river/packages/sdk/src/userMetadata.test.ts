/**
 * @group main
 */

import { MemberPayload_Nft } from '@river-build/proto'
import { Client } from './client'
import { userIdFromAddress } from './id'
import {
    makeDonePromise,
    makeRandomUserAddress,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
} from './util.test'
import { make_MemberPayload_Nft } from './types'
import { bin_fromString, bin_toString } from '@river-build/dlog'

describe('userMetadataTests', () => {
    let bobsClient: Client
    let alicesClient: Client
    let evesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
        evesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
        await evesClient.stop()
    })

    test('clientCanSetDisplayNamesInSpace', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()

        const bobPromise = makeDonePromise()
        bobsClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await bobsClient.setDisplayName(streamId, 'bob')

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob']])
        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().displayNames.plaintextDisplayNames).toEqual(
                expected,
            )
        }
    })

    test('clientCanSetDisplayNamesInDM', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId]),
            )
        })

        const bobDisplayName = 'bob display name'
        await expect(bobsClient.setDisplayName(streamId, bobDisplayName)).toResolve()

        const expected = new Map<string, string>([[bobsClient.userId, bobDisplayName]])

        const bobPromise = makeDonePromise()
        bobsClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const clientDisplayNames =
                streamView!.getUserMetadata().displayNames.plaintextDisplayNames
            expect(clientDisplayNames).toEqual(expected)
        }
    })

    test('clientCanSetDisplayNamesInGDM', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).toResolve()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])
        const stream = await bobsClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(evesClient.joinStream(streamId)).toResolve()
        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId, evesClient.userId]),
            )
        })

        const bobDisplayName = 'bob display name'
        await expect(bobsClient.setDisplayName(streamId, bobDisplayName)).toResolve()

        const expected = new Map<string, string>([[bobsClient.userId, bobDisplayName]])

        const bobPromise = makeDonePromise()
        bobsClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const evePromise = makeDonePromise()
        evesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            evePromise.done()
        })

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()
        await evePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient, evesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const clientDisplayNames =
                streamView!.getUserMetadata().displayNames.plaintextDisplayNames
            expect(clientDisplayNames).toEqual(expected)
        }
    })

    test('clientsPickUpDisplayNamesAfterJoin', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.setDisplayName(streamId, 'bob')

        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()

        const alicePromise = makeDonePromise()
        alicesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob']])
        const alicesClientDisplayNames =
            alicesClient.streams.get(streamId)?.view.membershipContent.userMetadata.displayNames
                .plaintextDisplayNames
        expect(alicesClientDisplayNames).toEqual(expected)
    })

    test('clientCanSetUsernamesInSpaces', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()

        const bobPromise = makeDonePromise()
        bobsClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const setUsernamePromise = bobsClient.setUsername(streamId, 'bob-username')
        const expected = new Map<string, string>([[bobsClient.userId, 'bob-username']])
        // expect username to get updated immediately
        expect(
            bobsClient.streams.get(streamId)!.view.getUserMetadata().usernames.plaintextUsernames,
        ).toEqual(expected)

        expect(
            bobsClient.streams
                .get(streamId)!
                .view.getUserMetadata()
                .usernames.info(bobsClient.userId).username,
        ).toEqual('bob-username')

        // wait for the username request to send
        await setUsernamePromise
        // wait for the username to be updated
        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().usernames.plaintextUsernames).toEqual(expected)
            expect(streamView.getUserMetadata().usernames.info(bobsClient.userId).username).toEqual(
                'bob-username',
            )
        }
    })

    test('clientCanSetUsernamesInDMs', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).toResolve()

        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId]),
            )
        })

        const bobPromise = makeDonePromise()
        bobsClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        await bobsClient.setUsername(streamId, 'bob-username')

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob-username']])

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata()?.usernames.plaintextUsernames).toEqual(expected)
        }
    })

    test('clientCanSetUsernamesInGDMs', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).toResolve()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])

        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await evesClient.waitForStream(streamId)

        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(evesClient.joinStream(streamId)).toResolve()

        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId, evesClient.userId]),
            )
        })

        const bobPromise = makeDonePromise()
        bobsClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const evePromise = makeDonePromise()
        evesClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            evePromise.done()
        })

        await bobsClient.setUsername(streamId, 'bob-username')

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()
        await evePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob-username']])

        for (const client of [bobsClient, alicesClient, evesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().usernames.plaintextUsernames).toEqual(expected)
        }
    })

    test('clientCanSetEnsAddressesInSpace', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await alicesClient.waitForStream(streamId)

        const bobPromise = makeDonePromise()
        bobsClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const ensAddress = makeRandomUserAddress()
        await bobsClient.setEnsAddress(streamId, ensAddress)

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([
            [bobsClient.userId, userIdFromAddress(ensAddress)],
        ])
        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().ensAddresses.confirmedEnsAddresses).toEqual(
                expected,
            )
        }
    })

    test('clientCanSetEnsAddressesInDM', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId]),
            )
        })

        const bobPromise = makeDonePromise()
        bobsClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const ensAddress = makeRandomUserAddress()
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).toResolve()
        const expected = new Map<string, string>([
            [bobsClient.userId, userIdFromAddress(ensAddress)],
        ])

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const ensAddresses = streamView!.getUserMetadata().ensAddresses.confirmedEnsAddresses
            expect(ensAddresses).toEqual(expected)
        }
    })

    test('clientCanSetEnsAddressesInGDM', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).toResolve()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])
        const stream = await bobsClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(evesClient.joinStream(streamId)).toResolve()
        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId, evesClient.userId]),
            )
        })

        const bobPromise = makeDonePromise()
        bobsClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const evePromise = makeDonePromise()
        evesClient.on('streamEnsAddressUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            evePromise.done()
        })

        const ensAddress = makeRandomUserAddress()
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).toResolve()
        const expected = new Map<string, string>([
            [bobsClient.userId, userIdFromAddress(ensAddress)],
        ])

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()
        await evePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient, evesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const ensAddresses = streamView!.getUserMetadata().ensAddresses.confirmedEnsAddresses
            expect(ensAddresses).toEqual(expected)
        }
    })

    test('clientCannotSetInvalidEnsAddresses', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const ensAddress = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).rejects.toThrow(
            /Invalid ENS address/,
        )
    })

    test('clientCanClearEnsAddress', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const ensAddress = new Uint8Array()
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).toResolve()
    })

    test('clientCanSetNftInSpace', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await alicesClient.waitForStream(streamId)

        const bobPromise = makeDonePromise()
        bobsClient.on('streamNftUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            bobPromise.done()
        })

        const alicePromise = makeDonePromise()
        alicesClient.on('streamNftUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })

        const nft = new MemberPayload_Nft({
            chainId: 1,
            tokenId: bin_fromString('11111111112222222233333333'),
            contractAddress: makeRandomUserAddress(),
        })
        await bobsClient.setNft(
            streamId,
            bin_toString(nft.tokenId),
            1,
            userIdFromAddress(nft.contractAddress)!,
        )

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, MemberPayload_Nft>([[bobsClient.userId, nft]])
        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().nfts.confirmedNfts).toEqual(expected)
            const bobInfo = streamView.getUserMetadata().nfts.info(bobsClient.userId)
            expect(bobInfo!.tokenId).toEqual('11111111112222222233333333')
        }
    })

    test('clientCannotSetNftsInvalidContractAddress', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = new MemberPayload_Nft({
            chainId: 1,
            tokenId: bin_fromString('123'),
            contractAddress: new Uint8Array([1, 2, 3]),
        })

        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid contract address')
    })

    test('clientCannotSetNftsInvalidChainId', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = new MemberPayload_Nft({
            chainId: 0,
            tokenId: bin_fromString('123'),
            contractAddress: makeRandomUserAddress(),
        })
        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid chain id')
    })

    test('clientCannotSetNftsInvalidTokenId', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = new MemberPayload_Nft({
            chainId: 1,
            tokenId: new Uint8Array(),
            contractAddress: makeRandomUserAddress(),
        })

        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid token id')
    })

    test('clientCanClearNft', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        await expect(bobsClient.setNft(streamId, '', 0, '')).toResolve()
    })
})
