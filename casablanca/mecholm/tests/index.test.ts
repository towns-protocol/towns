import { createOlmAccount } from '../src/index'

describe('Megolm Encryption Protocol', () => {
    test('emptyInitialTest', () => {
        expect(true).toBe(true)
    })

    test('testOlmAccountCreate', async () => {
        const account = await createOlmAccount()
        expect(account).toBeDefined()
        expect(Object.entries(account).length).toEqual(2)
    })
})
