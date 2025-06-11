import debug from 'debug'
import { BASE_SEPOLIA } from '../src/utils/Web3Constants'
import { LocalhostWeb3Provider } from '../src/test-helpers/LocalhostWeb3Provider'
import { describe, it, expect } from 'vitest'
const log = debug('web3:test')

describe('Web3Constants', () => {
    it('BASE_SEPOLIA', () => {
        expect(BASE_SEPOLIA).toBe(84532)
    })

    it('instantiate provider', () => {
        log('testing provider instantiation')
        const p = new LocalhostWeb3Provider('http://localhost:8545')
        expect(p).toBeDefined()
    })
})
