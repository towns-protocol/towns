import { makeDMStreamId } from './id'

describe('idTest', () => {
    test('makeDMStreamIdTests', async () => {
        const userId1 = '0x376eC15Fa24A76A18EB980629093cFFd559333Bb'
        const userId2 = '0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44'
        const expectedId = 'DMDM-b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f36'
        const id = makeDMStreamId(userId1, userId2)
        expect(id).toBe(expectedId)

        const caseInsensitiveId = makeDMStreamId(userId1.toLowerCase(), userId2.toLowerCase())
        expect(caseInsensitiveId).toBe(expectedId)

        const reverseOrderId = makeDMStreamId(userId2, userId1)
        expect(reverseOrderId).toBe(expectedId)
    })
})
