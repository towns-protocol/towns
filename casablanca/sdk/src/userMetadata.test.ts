/**
 * @group main
 */

import { Client } from './client'
import { makeDonePromise, makeTestClient, waitFor } from './util.test'

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

        const { streamId } = await bobsClient.createSpace(undefined)
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
        const { streamId } = await bobsClient.createSpace(undefined)
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

        const { streamId } = await bobsClient.createSpace(undefined)
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

        await bobsClient.setUsername(streamId, 'bob-username')

        await bobPromise.expectToSucceed()
        await alicePromise.expectToSucceed()

        const expected = new Map<string, string>([[bobsClient.userId, 'bob-username']])
        for (const client of [bobsClient, alicesClient]) {
            const streamView = client.streams.get(streamId)!.view
            expect(streamView.getUserMetadata().usernames.plaintextUsernames).toEqual(expected)
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
})
