import { dlog } from './dlog'
import { bin_fromHexString } from './types'

describe('dlogTest', () => {
    test('basic', () => {
        const longHex = bin_fromHexString('0102030405060708090a0b0c0d0e0f101112131415161718191a')
        const obj = {
            a: 1,
            b: 'b',
            c: {
                d: 2,
                e: 'e',
            },
            d: [1, 2, 3],
            q: new Uint8Array([1, 2, 3]),
            longHex,
            nested: {
                a: 1,
                more: {
                    even_more: {
                        more_yet: {
                            z: 1000,
                        },
                    },
                },
            },
        }
        const log = dlog('test:dlog')
        log(obj)
        log('\n\n\n')

        log('obj =', obj)
        log('\n\n\n')

        log('b', 'q', obj, obj, 'end')
        log('\n\n\n')

        log(obj, obj)
        log('\n\n\n')

        log('obj =', obj, 'obj =', obj)
        log('\n\n\n')

        log(longHex)
        log('\n\n\n')

        log('longHex =', longHex)
        log('\n\n\n')
    })

    test('extend', () => {
        const base_log = dlog('test:dlog')
        const log = base_log.extend('extend')
        log('extend')
        log(22)
        log('33 =', 22)
        log('gonna print more', '44 =', 44)
    })

    test('enabled', () => {
        const log = dlog('test:dlog')
        if (log.enabled) {
            log('enabled', log.enabled)

            log.enabled = false

            log('(should not print)', log.enabled)

            log.enabled = true

            log('enabled', log.enabled)
        }
    })
})
