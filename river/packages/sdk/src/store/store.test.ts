/**
 * @group main
 */
import Dexie from 'dexie'

describe('datastore tests', () => {
    // new test with description "decorator tests"
    test('dexie expectations', async () => {
        interface AAA {
            id: string
            name: string
        }

        interface BBB {
            id: string
            name: string
            aa: AAA
        }

        interface CCC {
            id: string
            name: string
            bb: BBB
            eventNum: bigint
        }

        const db = new Dexie('test')

        db.version(1).stores({
            aa: 'id',
            bb: 'id',
            cc: 'id',
        })

        const result = await db.table<AAA, string>('aa').put({ id: '1', name: 'foo1' })
        expect(result).toBe('1')
        const result2 = await db
            .table<BBB, string>('bb')
            .put({ id: '1', name: 'bbb', aa: { id: '1', name: 'foo2' } })
        expect(result2).toBe('1')
        const result3 = await db.table<CCC, string>('cc').put({
            id: '1',
            name: 'ccc',
            eventNum: BigInt(9),
            bb: { id: '1', name: 'bbb', aa: { id: '1', name: 'foo3' } },
        })
        expect(result3).toBe('1')

        const cc = await db.table<CCC, string>('cc').get('1')
        expect(cc?.bb.aa.name).toBe('foo3')
        expect(cc?.eventNum).toBe(9n)
        const bb = await db.table<BBB, string>('bb').get('1')
        expect(bb?.aa.name).toBe('foo2')
        const aa = await db.table<AAA, string>('aa').get('1')
        expect(aa?.name).toBe('foo1')

        const result4 = await db.table<CCC, string>('cc').put({
            id: '1',
            name: 'ccc-new',
            eventNum: BigInt(10),
            bb: { id: '1', name: 'bbb', aa: { id: '1', name: 'foo5' } },
        })
        expect(result4).toBe('1')

        const cc2 = await db.table<CCC, string>('cc').get('1')
        expect(cc2?.bb.aa.name).toBe('foo5')
        expect(cc2?.eventNum).toBe(10n)
        expect(cc2?.name).toBe('ccc-new')
    })
})
