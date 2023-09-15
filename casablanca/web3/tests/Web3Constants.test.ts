import debug from 'debug'
import { GOERLI } from '../src/Web3Constants'
import { LocalhostWeb3Provider } from '../src/Utils'
const log = debug('web3:test')

describe('Web3Constants', () => {
    ;``
    test('GOERLI', () => {
        expect(GOERLI).toBe(5)
    })

    test('instantiate provider', () => {
        log('testing provider instanciation')
        const p = new LocalhostWeb3Provider()
        expect(p).toBeDefined()
    })
})
