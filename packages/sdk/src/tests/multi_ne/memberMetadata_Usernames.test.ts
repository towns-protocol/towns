/**
 * @group main
 */

import { EncryptedDataSchema } from '@towns-protocol/proto'
import { MemberMetadata_Usernames } from '../../memberMetadata_Usernames'
import { usernameChecksum } from '../../utils'
import { create } from '@bufbuild/protobuf'

describe('memberMetadata_UsernamesTests', () => {
    const streamId = 'streamid1'
    let usernames: MemberMetadata_Usernames
    beforeEach(() => {
        usernames = new MemberMetadata_Usernames(streamId, 'userid-1')
    })

    test('clientCanSetUsername', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))
    })

    test('clientCannotSetDuplicateUsername', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-2',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))
    })

    test('duplicateUsernamesAreCaseInsensitive', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        const username2 = 'BOB-USERNAME1'
        const checksum2 = usernameChecksum(username2, streamId)
        const encryptedData2 = create(EncryptedDataSchema, {
            ciphertext: username2,
            checksum: checksum2,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))

        usernames.addEncryptedData(
            'eventid-2',
            encryptedData2,
            'userid-2',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-2', username2)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))
    })

    test('usernameIsAvailableAfterChange', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username]]))

        const username2 = 'bob-username2'
        const checksum2 = usernameChecksum(username2, streamId)
        const encryptedData2 = create(EncryptedDataSchema, {
            ciphertext: username2,
            checksum: checksum2,
        })

        // userid-1 changes their username
        usernames.addEncryptedData(
            'eventid-2',
            encryptedData2,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-2', username2)
        expect(usernames.plaintextUsernames).toEqual(new Map([['userid-1', username2]]))

        // userid-2 can now use the old username
        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-2',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)

        expect(usernames.plaintextUsernames).toEqual(
            new Map([
                ['userid-1', username2],
                ['userid-2', username],
            ]),
        )
    })

    test('clientCannotFakeChecksum', async () => {
        const username = 'bob-username1'
        const checksum = 'invalid-checksum'
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        usernames.onDecryptedContent('eventid-1', username)
        expect(usernames.plaintextUsernames).toEqual(new Map([]))
    })

    test('encryptedFlagsAreReturnedWhenEncrypted', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )
        const info = usernames.info('userid-1')
        expect(info.usernameEncrypted).toEqual(true)

        usernames.onDecryptedContent('eventid-1', username)
        const infoAfterDecrypt = usernames.info('userid-1')
        expect(infoAfterDecrypt.usernameEncrypted).toEqual(false)
    })

    // in order to re-encrypt Olm-encrypted usernames using the new hybrid encryption,
    // we need to keep track of the existing user's username payload
    test('the current user`s username is accessible', async () => {
        const username = 'bob-username1'
        const checksum = usernameChecksum(username, streamId)
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: username,
            checksum: checksum,
        })

        usernames.addEncryptedData(
            'eventid-1',
            encryptedData,
            'userid-1',
            true,
            undefined,
            undefined,
            undefined,
        )

        const current = usernames.currentUsernameEncryptedData
        expect(current).toEqual(encryptedData)
    })
})
