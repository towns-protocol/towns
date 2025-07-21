/**
 * @group main
 */

import { MemberPayload_Nft, MemberPayload_NftSchema } from '@towns-protocol/proto'
import { Client } from '../../client'
import { makeUniqueChannelStreamId, userIdFromAddress } from '../../id'
import {
    makeDonePromise,
    makeRandomUserAddress,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
} from '../testUtils'
import { make_MemberPayload_Nft } from '../../types'
import { bin_fromString, bin_toString } from '@towns-protocol/dlog'
import { create } from '@bufbuild/protobuf'

describe('memberMetadataTests', () => {
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
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()

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
            expect(streamView.getMemberMetadata().displayNames.plaintextDisplayNames).toEqual(
                expected,
            )
        }
    })

    test('clientCanSetDisplayNamesInDM', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId]),
            )
        })

        const bobDisplayName = 'bob display name'
        await expect(bobsClient.setDisplayName(streamId, bobDisplayName)).resolves.not.toThrow()

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
                streamView!.getMemberMetadata().displayNames.plaintextDisplayNames
            expect(clientDisplayNames).toEqual(expected)
        }
    })

    test('clientCanSetDisplayNamesInGDM', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).resolves.not.toThrow()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])
        const stream = await bobsClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
        await expect(evesClient.joinStream(streamId)).resolves.not.toThrow()
        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId, evesClient.userId]),
            )
        })

        const bobDisplayName = 'bob display name'
        await expect(bobsClient.setDisplayName(streamId, bobDisplayName)).resolves.not.toThrow()

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
                streamView!.getMemberMetadata().displayNames.plaintextDisplayNames
            expect(clientDisplayNames).toEqual(expected)
        }
    })

    test('clientsPickUpDisplayNamesAfterJoin', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.setDisplayName(streamId, 'bob')

        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()

        const alicePromise = makeDonePromise()
        alicesClient.on('streamDisplayNameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            alicePromise.done()
        })
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob']])
        const alicesClientDisplayNames =
            alicesClient.streams.get(streamId)?.view.membershipContent.memberMetadata.displayNames
                .plaintextDisplayNames
        expect(alicesClientDisplayNames).toEqual(expected)
    })

    test('clientCanSetUsernamesInSpaces', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()

        const startTime = Date.now()
        let usernameSetTime: number | null = null
        const bobPromise = makeDonePromise()
        bobsClient.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(bobsClient.userId)
            usernameSetTime = Date.now()
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
            bobsClient.streams.get(streamId)!.view.getMemberMetadata().usernames.plaintextUsernames,
        ).toEqual(expected)

        expect(
            bobsClient.streams
                .get(streamId)!
                .view.getMemberMetadata()
                .usernames.info(bobsClient.userId).username,
        ).toEqual('bob-username')

        // wait for the username request to send
        await setUsernamePromise
        // wait for the username to be updated
        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        // Verify that setting the username was not delayed — see `setUsername delays` for details
        const elapsed = usernameSetTime! - startTime
        expect(elapsed).toBeLessThanOrEqual(5000)

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getMemberMetadata().usernames.plaintextUsernames).toEqual(expected)
            expect(
                streamView.getMemberMetadata().usernames.info(bobsClient.userId).username,
            ).toEqual('bob-username')
        }
    })

    test('clientCanSetUsernamesInDMs', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()

        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
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
            expect(streamView.getMemberMetadata()?.usernames.plaintextUsernames).toEqual(expected)
        }
    })

    test('clientCanSetUsernamesInGDMs', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).resolves.not.toThrow()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])

        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await evesClient.waitForStream(streamId)

        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
        await expect(evesClient.joinStream(streamId)).resolves.not.toThrow()

        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
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
            expect(streamView.getMemberMetadata().usernames.plaintextUsernames).toEqual(expected)
        }
    })

    test('clientCanSetEnsAddressesInSpace', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
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
            expect(streamView.getMemberMetadata().ensAddresses.confirmedEnsAddresses).toEqual(
                expected,
            )
        }
    })

    test('clientCanSetEnsAddressesInDM', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await alicesClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
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
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).resolves.not.toThrow()
        const expected = new Map<string, string>([
            [bobsClient.userId, userIdFromAddress(ensAddress)],
        ])

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const ensAddresses = streamView!.getMemberMetadata().ensAddresses.confirmedEnsAddresses
            expect(ensAddresses).toEqual(expected)
        }
    })

    test('clientCanSetEnsAddressesInGDM', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()
        await expect(evesClient.initializeUser()).resolves.not.toThrow()
        evesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            evesClient.userId,
        ])
        const stream = await bobsClient.waitForStream(streamId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
        await expect(evesClient.joinStream(streamId)).resolves.not.toThrow()
        await waitFor(() => {
            expect(stream.view.getMembers().joinedUsers).toEqual(
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
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).resolves.not.toThrow()
        const expected = new Map<string, string>([
            [bobsClient.userId, userIdFromAddress(ensAddress)],
        ])

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()
        await evePromise.expectToSucceed()

        for (const client of [bobsClient, alicesClient, evesClient]) {
            const streamView = client.streams.get(streamId)?.view
            expect(streamView).toBeDefined()
            const ensAddresses = streamView!.getMemberMetadata().ensAddresses.confirmedEnsAddresses
            expect(ensAddresses).toEqual(expected)
        }
    })

    test('clientCannotSetInvalidEnsAddresses', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
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
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const ensAddress = new Uint8Array()
        await expect(bobsClient.setEnsAddress(streamId, ensAddress)).resolves.not.toThrow()
    })

    test('clientCanSetNftInSpace', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)
        await bobsClient.inviteUser(streamId, alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
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

        const nft = create(MemberPayload_NftSchema, {
            chainId: 1,
            tokenId: bin_fromString('11111111112222222233333333'),
            contractAddress: makeRandomUserAddress(),
        })
        await bobsClient.setNft(
            streamId,
            bin_toString(nft.tokenId),
            1,
            userIdFromAddress(nft.contractAddress),
        )

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, MemberPayload_Nft>([[bobsClient.userId, nft]])
        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getMemberMetadata().nfts.confirmedNfts).toEqual(expected)
            const bobInfo = streamView.getMemberMetadata().nfts.info(bobsClient.userId)
            expect(bobInfo?.tokenId).toEqual('11111111112222222233333333')
        }
    })

    test('clientCannotSetNftsInvalidContractAddress', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = create(MemberPayload_NftSchema, {
            chainId: 1,
            tokenId: bin_fromString('123'),
            contractAddress: new Uint8Array([1, 2, 3]),
        })

        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid contract address')
    })

    test('clientCannotSetNftsInvalidChainId', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = create(MemberPayload_NftSchema, {
            chainId: 0,
            tokenId: bin_fromString('123'),
            contractAddress: makeRandomUserAddress(),
        })
        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid chain id')
    })

    test('clientCannotSetNftsInvalidTokenId', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        const nft = create(MemberPayload_NftSchema, {
            chainId: 1,
            tokenId: new Uint8Array(),
            contractAddress: makeRandomUserAddress(),
        })

        await expect(
            bobsClient.makeEventAndAddToStream(streamId, make_MemberPayload_Nft(nft)),
        ).rejects.toThrow('invalid token id')
    })

    test('clientCanClearNft', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        await bobsClient.waitForStream(streamId)

        await expect(bobsClient.setNft(streamId, '', 0, '')).resolves.not.toThrow()
    })

    test('clientCanSetStreamEncryptionAlgorithm', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const spaceId = makeUniqueSpaceStreamId()
        const channelId = makeUniqueChannelStreamId(spaceId)
        await bobsClient.createSpace(spaceId)
        await bobsClient.waitForStream(spaceId)

        await bobsClient.createChannel(spaceId, 'secret channel', 'messaging like spies', channelId)
        await bobsClient.waitForStream(channelId)

        // initial value is "undefined"
        expect(bobsClient.stream(channelId)?.view.membershipContent.encryptionAlgorithm).toBe(
            undefined,
        )

        const newAlgorithm = 'mega_v1'
        const truePromise = makeDonePromise()
        bobsClient.once('streamEncryptionAlgorithmUpdated', (updatedStreamId, value) => {
            expect(updatedStreamId).toBe(channelId)
            expect(value).toBe(newAlgorithm)
            truePromise.done()
        })

        await expect(
            bobsClient.setStreamEncryptionAlgorithm(channelId, newAlgorithm),
        ).resolves.not.toThrow()
        await truePromise.expectToSucceed()
        expect(bobsClient.stream(channelId)?.view.membershipContent.encryptionAlgorithm).toBe(
            newAlgorithm,
        )

        // toggle back to to undefined
        const falsePromise = makeDonePromise()
        bobsClient.once('streamEncryptionAlgorithmUpdated', (updatedStreamId, value) => {
            expect(updatedStreamId).toBe(channelId)
            expect(value).toBe(undefined)
            falsePromise.done()
        })

        await expect(
            bobsClient.setStreamEncryptionAlgorithm(channelId, undefined),
        ).resolves.not.toThrow()
        await falsePromise.expectToSucceed()
        expect(bobsClient.stream(channelId)?.view.membershipContent.encryptionAlgorithm).toBe(
            undefined,
        )
    })

    test('setUsername delays for large groups without hybrid session', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        // Create client
        const clientWithSettings = await makeTestClient()

        await clientWithSettings.initializeUser()
        clientWithSettings.startSync()

        const streamId = makeUniqueSpaceStreamId()
        await clientWithSettings.createSpace(streamId)
        await clientWithSettings.waitForStream(streamId)

        // Add more members to exceed threshold

        await alicesClient.joinStream(streamId)
        await bobsClient.joinStream(streamId)

        await waitFor(() => {
            expect(
                clientWithSettings.streams.get(streamId)?.view.membershipContent.joined.size,
            ).toBe(3)
        })

        // Mock hasHybridSession to return false
        clientWithSettings['cryptoBackend']!.hasHybridSession = async () => false

        const startTime = Date.now()
        let usernameSetTime: number | null = null
        let pendingUsernameSetTime: number | null = null

        const streamUsernameUpdated = makeDonePromise()
        clientWithSettings.on('streamUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(clientWithSettings.userId)
            usernameSetTime = Date.now()
            streamUsernameUpdated.done()
        })

        const streamPendingUsernameUpdated = makeDonePromise()
        clientWithSettings.once('streamPendingUsernameUpdated', (updatedStreamId, userId) => {
            expect(updatedStreamId).toBe(streamId)
            expect(userId).toBe(clientWithSettings.userId)
            pendingUsernameSetTime = Date.now()
            streamPendingUsernameUpdated.done()
        })

        // Should not set immediately - will be delayed
        await clientWithSettings.setUsername(streamId, 'delayed-username', false, {
            largeGroupThreshold: 2, // Low threshold for testing
            delayMs: 2000, // 2 seconds for faster testing
        })

        const stream = clientWithSettings.streams.get(streamId)!
        expect(
            stream.view
                .getMemberMetadata()
                .usernames.plaintextUsernames.get(clientWithSettings.userId),
        ).toBe('delayed-username')

        // Verify timeout was set
        expect(clientWithSettings['pendingUsernameTimeouts'].has(streamId)).toBe(true)
        expect(clientWithSettings['pendingUsernames'].get(streamId)).toBe('delayed-username')
        await streamPendingUsernameUpdated.expectToSucceed()

        // Wait for the delayed set
        await streamUsernameUpdated.expectToSucceed()

        // Verify it was delayed by approximately the configured time
        const elapsed = usernameSetTime! - startTime
        expect(elapsed).toBeGreaterThanOrEqual(2000)

        const pendingUsernameElapsed = pendingUsernameSetTime! - startTime
        expect(pendingUsernameElapsed).toBeLessThanOrEqual(100)

        expect(clientWithSettings['pendingUsernameTimeouts'].has(streamId)).toBe(false)
        expect(clientWithSettings['pendingUsernames'].get(streamId)).toBe(undefined)

        await clientWithSettings.stop()
    })
})
