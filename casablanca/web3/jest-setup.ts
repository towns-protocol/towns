type TestConfig = {
    rpcUrl?: string
    entryPointAddress?: string
    factoryAddress?: string
    bundlerUrl?: string
    paymasterUrl?: string
}

let testConfig: TestConfig = {}

try {
    // @ts-ignore
    // eslint-disable-next-line import/no-unresolved
    const testConfigModule = (await import('./test-config.json')).default as TestConfig
    testConfig = testConfigModule
} catch (error) {
    console.warn('No secrets file found. Using default values.')
}
process.env.NODE_ENV = 'test'
process.env.RPC_URL = process.env.RPC_URL || testConfig.rpcUrl || 'http://127.0.0.1:8545'
process.env.BUNDLER_URL =
    process.env.BUNDLER_URL || testConfig.bundlerUrl || 'http://localhost:4337/rpc'
process.env.PAYMASTER_URL = process.env.PAYMASTER_URL || testConfig.paymasterUrl || undefined

if (process.env.ENTRY_POINT_ADDRESS || testConfig.entryPointAddress) {
    process.env.ENTRY_POINT_ADDRESS =
        process.env.ENTRY_POINT_ADDRESS || testConfig.entryPointAddress // todo: add once local dev works
}

if (process.env.FACTORY_ADDRESS || testConfig.factoryAddress) {
    process.env.FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || testConfig.factoryAddress // todo: add once local dev works
}

export {}
