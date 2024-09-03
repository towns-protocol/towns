import { parseChannelMetadataJSON, NoEntitledWalletError } from './Utils'

describe('utils.test.ts', () => {
    test('channelMetadataJson', async () => {
        expect(parseChannelMetadataJSON('{"name":"name","description":"description"}')).toEqual({
            name: 'name',
            description: 'description',
        })
        expect(parseChannelMetadataJSON('name')).toEqual({
            name: 'name',
            description: '',
        })
        expect(parseChannelMetadataJSON('11111')).toEqual({
            name: '11111',
            description: '',
        })
    })

    describe('NoEntitledWalletError', () => {
        test('instanceof', () => {
            expect(new NoEntitledWalletError()).toBeInstanceOf(NoEntitledWalletError)
        })

        test('mix of no entitled wallet and other errors should throw', async () => {
            const runtimeError = new Error('test')
            // An AggregateError with a NoEntitledWalletError and a generic runtime error should
            //throw a new AggregateError with just the runtime error.
            await expect(
                Promise.any([
                    Promise.reject(new NoEntitledWalletError()),
                    Promise.reject(runtimeError),
                ]).catch(NoEntitledWalletError.throwIfRuntimeErrors),
            ).rejects.toThrow(new AggregateError([runtimeError]))
        })

        test('only no entitled wallet errors should not throw', async () => {
            await expect(
                Promise.any([
                    Promise.reject(new NoEntitledWalletError()),
                    Promise.reject(new NoEntitledWalletError()),
                ]).catch(NoEntitledWalletError.throwIfRuntimeErrors),
            ).resolves.toBeUndefined()
        })
    })
})
