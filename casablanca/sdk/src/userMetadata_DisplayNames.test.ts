import { EncryptedData } from '@river/proto'
import { UserMetadata_DisplayNames } from './userMetadata_DisplayNames'

describe('userMetadata_DisplayNamesTests', () => {
    const streamId = 'streamid1'
    let displayNames: UserMetadata_DisplayNames
    beforeEach(() => {
        displayNames = new UserMetadata_DisplayNames(streamId)
    })

    test('clientCanSetDisplayName', async () => {
        const displayName = 'Bob Display Name'
        const encryptedData = new EncryptedData({
            ciphertext: displayName,
        })
        displayNames.addEncryptedData('eventid-1', encryptedData, 'userid-1')

        // the plaintext map is empty until we've decrypted the display name
        expect(displayNames.plaintextDisplayNames).toEqual(new Map([]))
        displayNames.onDecryptedContent('eventid-1', displayName)
        expect(displayNames.plaintextDisplayNames).toEqual(new Map([['userid-1', displayName]]))
    })

    test('clientCanUseSameDisplayName', async () => {
        const displayName = 'Bob Display Name'
        const encryptedData = new EncryptedData({
            ciphertext: displayName,
        })
        displayNames.addEncryptedData('eventid-1', encryptedData, 'userid-1')
        displayNames.addEncryptedData('eventid-2', encryptedData, 'userid-2')
        expect(displayNames.plaintextDisplayNames).toEqual(new Map([]))

        displayNames.onDecryptedContent('eventid-1', displayName)
        displayNames.onDecryptedContent('eventid-2', displayName)

        // the plaintext map now contains two entries, one for each user
        // using the same display name
        expect(displayNames.plaintextDisplayNames).toEqual(
            new Map([
                ['userid-1', displayName],
                ['userid-2', displayName],
            ]),
        )
    })

    test('encryptedFlagsAreReturnedWhenEncrypted', async () => {
        const displayName = 'bob-username1'
        const encryptedData = new EncryptedData({
            ciphertext: displayName,
        })

        displayNames.addEncryptedData('eventid-1', encryptedData, 'userid-1')
        const info = displayNames.info('userid-1')
        expect(info.displayNameEncrypted).toEqual(true)

        displayNames.onDecryptedContent('eventid-1', displayName)
        const infoAfterDecrypt = displayNames.info('userid-1')
        expect(infoAfterDecrypt.displayNameEncrypted).toEqual(false)
    })
})
