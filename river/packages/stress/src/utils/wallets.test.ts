import { dlogger } from '@river-build/dlog'
import { generateWalletsFromSeed } from './wallets'

const logger = dlogger('stress:wallets')

describe('wallets.test.ts', () => {
    test('generates wallets from seed phrase', () => {
        // Example usage:
        const seedPhrase = 'test test test test test test test test test test test junk'
        const wallets = generateWalletsFromSeed(seedPhrase, 0, 3)
        logger.log(
            'wallets',
            wallets.map((w) => ({ address: w.address, privateKey: w.privateKey })),
        )

        expect(wallets.length).toBe(3)
        // should run the same every time
        expect(wallets[0].address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
        expect(wallets[0].privateKey).toBe(
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        )
        expect(wallets[1].address).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
        expect(wallets[1].privateKey).toBe(
            '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        )
        expect(wallets[2].address).toBe('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')
        expect(wallets[2].privateKey).toBe(
            '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        )
    })
})
