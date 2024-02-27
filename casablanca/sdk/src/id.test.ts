/**
 * @group main
 */

import {
    isValidStreamId,
    makeDMStreamId,
    checkStreamId,
    makeUniqueSpaceStreamId,
    makeUniqueChannelStreamId,
    makeUniqueGDMChannelStreamId,
    makeUniqueMediaStreamId,
    makeUserStreamId,
    userIdFromAddress,
    addressFromUserId,
} from './id'
import { makeRandomUserContext } from './util.test'

describe('idTest', () => {
    test('validStreamId', () => {
        expect(
            isValidStreamId('10b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f'),
        ).toBe(true)
        expect(
            isValidStreamId('1010101010101010101010101010101010101010101010101010101010101010'),
        ).toBe(true)
        expect(isValidStreamId('a81010101010101010101010101010101010101010')).toBe(true)

        expect(isValidStreamId('')).toBe(false)
        expect(isValidStreamId('0')).toBe(false)
        expect(isValidStreamId('00')).toBe(false)
        expect(isValidStreamId('101')).toBe(false)
        expect(isValidStreamId('10AA')).toBe(false)
        expect(isValidStreamId('10111')).toBe(false)
        expect(isValidStreamId('10AAbb')).toBe(false)
        expect(isValidStreamId('1000')).toBe(false)
        expect(
            isValidStreamId('10B6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f'),
        ).toBe(false)
        expect(
            isValidStreamId('1110101010101010101010101010101010101010101010101010101010101010'),
        ).toBe(false)
        expect(isValidStreamId('a810101010101010101010101010101010101010')).toBe(false)
        expect(isValidStreamId('a8101010101010101010101010101010101010101')).toBe(false)
        expect(isValidStreamId('a8101010101010101010101010101010101010101000')).toBe(false)
        expect(
            isValidStreamId('10b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f36'),
        ).toBe(false)
        expect(
            isValidStreamId('101010101010101010101010101010101010101010101010101010101010101010'),
        ).toBe(false)
        expect(isValidStreamId('0x10aa')).toBe(false)
    })

    test('checkStreamId', () => {
        expect(() => {
            checkStreamId('')
        }).toThrow('Invalid stream id: ')
    })

    test('makeDMStreamId', () => {
        const userId1 = '0x376eC15Fa24A76A18EB980629093cFFd559333Bb'
        const userId2 = '0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44'
        const expectedId = '88b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f'
        const id = makeDMStreamId(userId1, userId2)
        expect(id).toBe(expectedId)

        const caseInsensitiveId = makeDMStreamId(userId1.toLowerCase(), userId2.toLowerCase())
        expect(caseInsensitiveId).toBe(expectedId)

        const reverseOrderId = makeDMStreamId(userId2, userId1)
        expect(reverseOrderId).toBe(expectedId)
    })

    test('makeUnique', () => {
        expect(isValidStreamId(makeUniqueSpaceStreamId())).toBe(true)
        expect(isValidStreamId(makeUniqueChannelStreamId())).toBe(true)
        expect(isValidStreamId(makeUniqueGDMChannelStreamId())).toBe(true)
        expect(isValidStreamId(makeUniqueMediaStreamId())).toBe(true)
    })

    test('makeUserStreamId', () => {
        expect(makeUserStreamId('0x376eC15Fa24A76A18EB980629093cFFd559333Bb')).toBe(
            'a8376ec15fa24a76a18eb980629093cffd559333bb',
        )
    })

    test('userIdFromAddress-addressFromUserId', async () => {
        const usrCtx = await makeRandomUserContext()
        const userId = userIdFromAddress(usrCtx.creatorAddress)
        const address = addressFromUserId(userId)
        expect(address).toStrictEqual(usrCtx.creatorAddress)
    })
})
