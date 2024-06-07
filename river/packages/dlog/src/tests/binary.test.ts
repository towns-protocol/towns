/**
 * @group main
 */

import { bin_fromBase64, bin_fromHexString, isHexString } from '../binary'

describe('types', () => {
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

    test('bin_fromBase64String', () => {
        const expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
        const expected2 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        expect(bin_fromBase64('AQIDBAUGBwgJ')).toEqual(expected)
        expect(bin_fromBase64('AQIDBAUGBwgJAQIDBAUGBwgJ')).toEqual(expected2)
        expect(bin_fromBase64('')).toEqual(new Uint8Array([]))
        expect(bin_fromBase64('AA==')).toEqual(new Uint8Array([0]))
    })

    test('isHexString', () => {
        expect(isHexString('0123456789abcdef')).toBeTruthy()
        expect(isHexString('0123456789ABCDEF')).toBeTruthy()
        expect(isHexString('0x0123456789abcdef')).toBeTruthy()
        expect(isHexString('00')).toBeTruthy()
        expect(isHexString('01')).toBeTruthy()
        expect(isHexString('0a')).toBeTruthy()
        expect(isHexString('0000')).toBeTruthy()
        expect(isHexString('0001')).toBeTruthy()

        expect(isHexString('')).toBeFalsy()
        expect(isHexString('0x')).toBeFalsy()
        expect(isHexString('0')).toBeFalsy()
        expect(isHexString('0x0')).toBeFalsy()
        expect(isHexString('001')).toBeFalsy()
        expect(isHexString('11223')).toBeFalsy()
    })
})
