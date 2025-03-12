import { LocalhostWeb3Provider } from '@river-build/web3'
import { createSpaceDappAndUserops, generatePrivyWalletIfKey } from './utils'
import { Address } from 'viem'

// see userops/src/lib/permissionless/accounts/simple/toSimpleAccount.ts for the problem description
// this private key will break permissionless.js
const PRIVATE_KEY = '0x1ffeb42d5991715177ec8bf1f06aef3a62e558d3dc6a686cc9fe23a8ab652bb2'

// this is the address that the smart account for this private key should have
const COUNTERFACTUAL_ADDRESS = '0xeff76E9F3414E53b6362E230107145cf118f1883'

test('can create a simple account with this private key', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(PRIVATE_KEY),
    )
    const { userOps } = await createSpaceDappAndUserops(alice)
    const simpleAccount = await userOps.getSmartAccountClient({
        signer: alice.wallet,
    })
    expect(simpleAccount).toBeDefined()
    const saAddress = simpleAccount.address
    expect(saAddress).toBeDefined()
    const aaGetAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaGetAddress).toBeDefined()
    expect(aaGetAddress).toBe(saAddress)
    expect(aaGetAddress).toBe(COUNTERFACTUAL_ADDRESS)
})
