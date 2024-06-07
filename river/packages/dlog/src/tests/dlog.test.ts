/**
 * @group main
 */

import { dlog, dlogError } from '../dlog'
import debug from 'debug'
import { bin_fromHexString } from '../binary'

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
        log('shortenedHexKey =', { '0x0102030405060708090a0b0c0d0e0f101112131415161718191a': true })
        log('shortenedHexValue =', '0x0102030405060708090a0b0c0d0e0f101112131415161718191a')
        log('shortenedHexValue =', {
            key: '0x0102030405060708090a0b0c0d0e0f101112131415161718191a',
        })
    })

    test('extend', () => {
        const base_log = dlog('test:dlog')
        const log = base_log.extend('extend')
        log('extend')
        log(22)
        log('33 =', 33)
        log('gonna print more', '44 =', 44)
    })

    test('enabled1', () => {
        const log = dlog('test:dlog')
        if (log.enabled) {
            log('enabled', log.enabled)

            log.enabled = false

            log('(should not print)', log.enabled)

            log.enabled = true

            log('enabled', log.enabled)
        }
    })

    test('circularReference', () => {
        const log = dlog('test:dlog')
        class A {
            b: B
            constructor() {
                this.b = new B(this)
            }
        }
        class B {
            a: A
            constructor(a: A) {
                this.a = a
            }
        }
        const a = new A()
        log('test circular:', { a })
    })

    test('numbers', () => {
        const log = dlog('test:dlog')
        log('test same number:', { a: 1, b: 1, c: 1, d: 2 })
    })

    test('error', () => {
        const log = dlogError('test:dlog:error')
        log('test same number:', { a: 1, b: 1, c: 1, d: 2 })
        log(new Error('test error'))

        function funcThatThrows() {
            throw new Error('test error 2')
        }

        try {
            funcThatThrows()
        } catch (e) {
            log(e)
        }

        try {
            funcThatThrows()
        } catch (e) {
            log('test error 3', e, 123, 'more text')
        }
    })

    test('set', () => {
        const s = new Set([111, 222, { aaa: 333 }])
        dlog('test:dlog')(s)

        const log = dlog('test:dlog')
        log.enabled = true

        let output: string = ''
        log.baseDebug.log = (...args: any[]) => {
            for (const arg of args) {
                output += `${arg}`
            }
        }

        log(s)
        expect(output).toContain('111')
        expect(output).toContain('222')
        expect(output).toContain('333')
        expect(output).toContain('aaa')
    })

    test('map', () => {
        const s = new Map<string, any>([
            ['aaa', 111],
            ['bbb', 222],
            ['ccc', { a: 333 }],
        ])
        dlog('test:dlog')(s)

        const log = dlog('test:dlog')
        log.enabled = true

        let output: string = ''
        log.baseDebug.log = (...args: any[]) => {
            for (const arg of args) {
                output += `${arg}`
            }
        }

        log(s)
        expect(output).toContain('111')
        expect(output).toContain('aaa')
        expect(output).toContain('222')
        expect(output).toContain('bbb')
        expect(output).toContain('333')
        expect(output).toContain('ccc')
    })

    test('enabled2', () => {
        const ns = 'uniqueLogName'

        // Override
        let log = dlog(ns)
        expect(log.enabled).toBeFalsy()
        log.enabled = true
        expect(log.enabled).toBeTruthy()
        log.enabled = false
        expect(log.enabled).toBeFalsy()

        // Default
        log = dlog(ns, { defaultEnabled: true, allowJest: true })
        expect(log.enabled).toBeTruthy()
        log.enabled = false
        expect(log.enabled).toBeFalsy()

        // Default under Jest
        log = dlog(ns, { defaultEnabled: true })
        expect(log.enabled).toBeFalsy()
        log.enabled = true
        expect(log.enabled).toBeTruthy()

        // Enabled explicitly by settings
        debug.enable(ns)
        log = dlog(ns)
        expect(log.enabled).toBeTruthy()

        // Disabled explicitly by settings
        debug.enable('-' + ns)
        expect(log.enabled).toBeFalsy()

        // Disabled explicitly by settings, default ignored
        log = dlog(ns, { defaultEnabled: true, allowJest: true })
        expect(log.enabled).toBeFalsy()
    })
})
