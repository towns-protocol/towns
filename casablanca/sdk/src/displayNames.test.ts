import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'

describe('displayNames', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('clientCanSetDisplayNames', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        await alicesClient.startSync()

        const { streamId } = await bobsClient.createSpace(undefined)
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

        const bobClientDisplayNames =
            bobsClient.streams.get(streamId)?.view.spaceContent.userMetadata.plaintextDisplayNames

        expect(bobClientDisplayNames).toEqual(expected)

        const alicesClientDisplayNames =
            alicesClient.streams.get(streamId)?.view.spaceContent.userMetadata.plaintextDisplayNames
        expect(alicesClientDisplayNames).toEqual(expected)
    })

    test('clientsPickUpDisplayNamesAfterJoin', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        const { streamId } = await bobsClient.createSpace(undefined)
        await bobsClient.waitForStream(streamId)
        await bobsClient.setDisplayName(streamId, 'bob')

        await expect(alicesClient.initializeUser()).toResolve()
        await alicesClient.startSync()
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
            alicesClient.streams.get(streamId)?.view.spaceContent.userMetadata.plaintextDisplayNames
        expect(alicesClientDisplayNames).toEqual(expected)
    })
})
