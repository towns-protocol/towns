export const loadTestQueueName = 'loadtestqueue'
export const loadTestShutdownQueueName = 'shutdownqueue'
export const chainSpaceAndChannelJobName = 'chainSpaceAndChannelData'
export const numMessagesConfig = 10000 // sending one message takes about 100ms, sending 100 will be roughly 10s
export const numClientsConfig = 10
export const loadTestTimeout = 1180000
export const loadTestReceiverTimeout = 1050000 // sending 10000 message will take about 1000s
export const loadTestSignalCheckInterval = 100
export const defaultWaitForTimeout = 10000 // refer DefaultWaitForTimeoutMS in TestConstants.ts

export const jsonRpcProviderUrl = 'https://sepolia.base.org'
export const nodeRpcURL = 'https://river1-test-beta.towns.com'

export const connectionOptions = {
    host: 'localhost', // Redis server host
    port: 6379, // Redis server port
}

type Account = {
    address: string
    privateKey: string
}

export const bobsAccount: Account = {
    address: '0x852F033bcb5e2B3deE0F330c0797ac32A2ec60b5',
    privateKey: '367a5a51f540fc1d5049fdd4126d1d55f8e197ecf6f109a7631cd8e93edc1f5a',
}

export const alicesAccount: Account = {
    address: '0x5574a0bC58C01f9De8445769E9b130DEa71033Ef',
    privateKey: 'b9156e23276748885cd41e626f5ae1be83ef0f3b53b82af81dcd4ecea54d7d20',
}

export const accounts: Account[] = [
    {
        address: '0xcbb689413756Ec37FF54c98b79795ab2324Ffc4D',
        privateKey: 'f72c59b071bcb92c1fb70315739536cdf82cf2b5ebbb7607c282fe7c69411300',
    },
    {
        address: '0x29B4bd8DbEA61949164E125dBe3C400aDC65a7de',
        privateKey: '20921e50975c1df7515ec55ad66dd16d7cea24bc7fec7f84d58ccc509136ff17',
    },
    {
        address: '0x70f4Cf9659463d8a62B076009Ccf2260360d62a8',
        privateKey: 'e58c4d68ae892903c17023fed9d9f07d3f17cc0c4e40e5240a52e5015ff42b5f',
    },
    {
        address: '0x728dE3aB279AF607129DF1F211672Ed03983ce86',
        privateKey: '1c49900dad8040f24c7f1b593d6e40f53404627e80f366149112a349704afb65',
    },
    {
        address: '0xf958471830af36A9f192dEE39677f1dd3b275722',
        privateKey: '41da0091fa57dff3af872140d0e1cc16b441639302aa090afe77688c005fcb32',
    },
    {
        address: '0x72b7Bf9539FFBE356CE078f11f7e840eaCF0e2e8',
        privateKey: '3c82bf55ff8dc5b8ee3a416ee39e2ee658ad746fcfe682335237809579e36f49',
    },
    {
        address: '0xfb17dFc1EFf475bE366625400578f5E2a1Ee095E',
        privateKey: '53f9adbf934531b3c302412a3c8ca84a4285a318369a2e477b65a46a0a9371b1',
    },
    {
        address: '0xcDbF6F57A120E93cEdE97b4B9260195a749Bb154',
        privateKey: '6a474924f864b01d624209bc68b2297a3d7494ab61dc535a757342b5f584c8e2',
    },
    {
        address: '0x7319eA223dA39e9c79474d2Ba17096ed0039E4c0',
        privateKey: 'cc40ec16b82fd0332eb4f8149dd6e72500a432738dacf1817a68cc38386bc90c',
    },
]
