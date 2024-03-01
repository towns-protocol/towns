/**
 * @group core
 */

export {}

describe('Sign', () => {
    test('i-need-buffer', () => {
        const buffer = Buffer.from('hello world', 'ascii')
        expect(buffer).toBeInstanceOf(Uint8Array)
    })
})
