import JSDOMEnvironment from 'jest-environment-jsdom'

export default class JSDOMEnvironmentWithBuffer extends JSDOMEnvironment {
    constructor(...args: any[]) {
        // @ts-ignore
        super(...args)
        // JSDOMEnvironment patches global.Buffer, but doesn't
        // patch global.Uint8Array, leading to inconsistency and
        // test failures since Buffer should be an instance of Uint8Array.
        this.global.Uint8Array = Uint8Array
        this.global.TextEncoder = TextEncoder
        this.global.TextDecoder = TextDecoder
        this.global.fetch = fetch
        this.global.ReadableStream = ReadableStream
    }
}
