import { StreamEvent, StreamOp } from '@towns/proto'
import { makeUserStreamId } from './id'
import { bin_fromHexString, makeJoinableStreamPayload, stringify } from './types'

describe('types', () => {
    test('stringify', () => {
        const msg = new StreamEvent({
            creatorAddress: bin_fromHexString('0123456789abcdef'),
            prevEvents: [bin_fromHexString('0123456789abcdef'), bin_fromHexString('0123456789')],
            payload: makeJoinableStreamPayload({
                op: StreamOp.SO_JOIN,
                userId: makeUserStreamId('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
            }),
        })
        const s = stringify(msg)
        // console.dir(msg, { depth: null })
        // console.dir(s, { depth: null })
        expect(s.creatorAddressStr).toEqual('0x0123456789abcdef')
        expect(s.prevEventsStrs).toEqual(['0x0123456789abcdef', '0x0123456789'])
        expect(s.delegageSigStr).toEqual('')
        expect(s.payload).toBeDefined()
        expect(
            s.payload!.payload.case === 'joinableStream' ? s.payload!.payload.value.userId : '',
        ).toEqual('00-0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    })

    test('bin_fromHexString', () => {
        const expected = new Uint8Array([1, 35, 69, 103, 137, 171, 205, 239])
        expect(bin_fromHexString('0123456789abcdef')).toEqual(expected)
        expect(bin_fromHexString('0123456789ABCDEF')).toEqual(expected)
        expect(bin_fromHexString('0x0123456789abcdef')).toEqual(expected)
        expect(bin_fromHexString('')).toEqual(new Uint8Array([]))
        expect(bin_fromHexString('0x')).toEqual(new Uint8Array([]))
        expect(bin_fromHexString('00')).toEqual(new Uint8Array([0]))
        expect(bin_fromHexString('01')).toEqual(new Uint8Array([1]))
        expect(bin_fromHexString('0a')).toEqual(new Uint8Array([10]))
        expect(bin_fromHexString('0000')).toEqual(new Uint8Array([0, 0]))
        expect(bin_fromHexString('0001')).toEqual(new Uint8Array([0, 1]))

        expect(() => bin_fromHexString('0')).toThrow()
        expect(() => bin_fromHexString('0x0')).toThrow()
        expect(() => bin_fromHexString('001')).toThrow()
        expect(() => bin_fromHexString('11223')).toThrow()
    })
})
