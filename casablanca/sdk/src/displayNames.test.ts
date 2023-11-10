import { Client } from './client'
import { makeTestClient } from './util.test'

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
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()

        const { streamId } = await bobsClient.createSpace(undefined)
        await bobsClient.waitForStream(streamId)
        await bobsClient.setDisplayName(streamId, 'bob')

        await bobsClient.waitForStream(streamId)
        const displayNames = (await bobsClient.getStream(streamId)).spaceContent.userMetadata
            .plaintextDisplayNames
        const expected = new Map<string, string>([[bobsClient.userId, 'bob']])
        expect(displayNames).toEqual(expected)
    })
})
