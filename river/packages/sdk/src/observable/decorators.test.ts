/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// new test with description "decorator tests"

import { check, dlogger } from '@river-build/dlog'

const logger = dlogger('csb:test:decorators')

const ALL_NAMES = new Set<string>()

function decoratedWith(options: { fancyName: string }) {
    check(!ALL_NAMES.has(options.fancyName), `duplicate decorator name: ${options.fancyName}`)
    ALL_NAMES.add(options.fancyName)
    return function <T extends { new (...args: any[]): Something }>(constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                super(...args)
                this.baseName = options.fancyName
            }
            static fancyName = options.fancyName
        }
    }
}

class Something {
    baseName: string
    constructor() {
        this.baseName = ''
        logger.log(name)
    }
}

@decoratedWith({ fancyName: 'foo' })
class MyClass extends Something {
    constructor(public localName: string) {
        super()
    }
}

@decoratedWith({ fancyName: 'fooyou' })
class MyOtherClass extends Something {
    constructor(public localName: string) {
        super()
    }
}

describe('decorator tests', () => {
    test('decorated with', () => {
        const myClass = new MyClass('hello world')
        expect(myClass.baseName).toBe('foo')
        expect((MyClass as any).fancyName).toBe('foo')
        expect(myClass.localName).toBe('hello world')

        const classes = [MyClass, MyOtherClass]
        const names = classes.map((c) => (c as any).fancyName)
        expect(names).toStrictEqual(['foo', 'fooyou'])

        // expect duplicate decorators to fail
        try {
            @decoratedWith({ fancyName: 'foo' })
            class MyBadClass extends Something {}
            expect(MyBadClass).toBeUndefined()
        } catch (e) {
            expect((e as Error).message).toContain('duplicate decorator name: foo')
        }
    })
})
