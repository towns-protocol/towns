import JSDOMEnvironment from 'jest-environment-jsdom'

export default class JSDOMEnvironmentWithBuffer extends JSDOMEnvironment {
    constructor(...args: any[]) {
        // @ts-ignore
        super(...args)
        // JSDOMEnvironment patches global.Buffer, but doesn't
        // patch global.Uint8Array, leading to incostency and
        // test failures since Buffer should be an instance of Uint8Array.
        this.global.Uint8Array = Uint8Array
    }
}
