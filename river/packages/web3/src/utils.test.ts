import {
    parseChannelMetadataJSON,
    NoEntitledWalletError,
    SpaceAddressFromSpaceId,
    SpaceIdFromSpaceAddress,
} from './Utils'

describe('utils.test.ts', () => {
    it('channelMetadataJson', async () => {
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

    describe('SpaceAddressFromSpaceId', () => {
        it('should convert space id to space address', () => {
            expect(SpaceIdFromSpaceAddress('0xd645e5b484b4cf6c7aad2e74f58166c28781a6c9')).toEqual(
                '10d645e5b484b4cf6c7aad2e74f58166c28781a6c90000000000000000000000',
            )

            expect(
                SpaceAddressFromSpaceId(
                    '10d645e5b484b4cf6c7aad2e74f58166c28781a6c90000000000000000000000',
                ),
            ).toEqual('0xd645e5b484b4cf6C7Aad2e74F58166C28781A6c9')
        })
    })

    describe('NoEntitledWalletError', () => {
        it('instanceof', () => {
            expect(new NoEntitledWalletError()).toBeInstanceOf(NoEntitledWalletError)
        })

        it('mix of no entitled wallet and other errors should throw', async () => {
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

        it('only no entitled wallet errors should not throw', async () => {
            await expect(
                Promise.any([
                    Promise.reject(new NoEntitledWalletError()),
                    Promise.reject(new NoEntitledWalletError()),
                ]).catch(NoEntitledWalletError.throwIfRuntimeErrors),
            ).resolves.toBeUndefined()
        })
    })
})
