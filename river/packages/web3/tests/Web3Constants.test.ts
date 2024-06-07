import debug from 'debug'
import { BASE_SEPOLIA } from '../src/Web3Constants'
import { LocalhostWeb3Provider } from '../src/LocalhostWeb3Provider'
const log = debug('web3:test')

describe('Web3Constants', () => {
    ;``
    test('BASE_SEPOLIA', () => {
        expect(BASE_SEPOLIA).toBe(84532)
    })

    test('instantiate provider', () => {
        log('testing provider instanciation')
        const p = new LocalhostWeb3Provider('http://localhost:8545')
        expect(p).toBeDefined()
    })
})
