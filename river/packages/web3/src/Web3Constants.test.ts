import debug from 'debug'
import { BASE_SEPOLIA } from './Web3Constants'
import { LocalhostWeb3Provider } from './LocalhostWeb3Provider'
const log = debug('web3:test')

describe('Web3Constants', () => {
    ;``
    it('BASE_SEPOLIA', () => {
        expect(BASE_SEPOLIA).toBe(84532)
    })

    it('instantiate provider', () => {
        log('testing provider instanciation')
        const p = new LocalhostWeb3Provider('http://localhost:8545')
        expect(p).toBeDefined()
    })
})
