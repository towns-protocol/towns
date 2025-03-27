import { LocalhostWeb3Provider } from '@towns-protocol/web3'
import { createSpaceDappAndUserops, generatePrivyWalletIfKey } from './utils'
import { Address } from 'viem'
import { Wallet } from 'ethers'

// see userops/src/lib/permissionless/accounts/simple/toSimpleAccount.ts for the problem description
// this private key will break permissionless.js
const PRIVATE_KEY_THAT_BREAKS = '0x1ffeb42d5991715177ec8bf1f06aef3a62e558d3dc6a686cc9fe23a8ab652bb2'

// this private key is fine for testing, it's from a test privy account
const PRIVATE_KEY = '09892cb15045f5989457e72dd4c7321f29d1dcb93b9f90d78da6fc433852a367'
const PUBLIC_KEY = '0xE6b4E8299D6abB4027Ba08eB67cA81011366f193'

const simple = {
    AA_ADDRESS_FOR_PRIVATE_KEY_THAT_BREAKS: '0xeff76E9F3414E53b6362E230107145cf118f1883',
    AA_ADDRESS: '0x768f8EF9daab26D725Ff27386B0220d99C09ca13',
}

const modular = {
    AA_ADDRESS_FOR_PRIVATE_KEY_THAT_BREAKS: '0x6890Adc937399FB11dbC1f5d5F84F51E4dcfb7E9',
    AA_ADDRESS: '0x166f35f77Cf51E42c698fE4D0Be8A8768F3ef7c0',
}

test('can create an account with this private key and it wont break', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(PRIVATE_KEY_THAT_BREAKS),
    )
    const { userOps } = await createSpaceDappAndUserops(alice)
    const smartAccount = await userOps.getSmartAccountClient({
        signer: alice.wallet,
    })
    expect(smartAccount).toBeDefined()
    const saAddress = smartAccount.address
    expect(saAddress).toBeDefined()
    const aaGetAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aaGetAddress).toBeDefined()
    expect(aaGetAddress).toBe(saAddress)

    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'simple') {
        expect(aaGetAddress).toBe(simple.AA_ADDRESS_FOR_PRIVATE_KEY_THAT_BREAKS)
    } else {
        expect(aaGetAddress).toBe(modular.AA_ADDRESS_FOR_PRIVATE_KEY_THAT_BREAKS)
    }
})

test('UserOperations initializes with the correct sender', async () => {
    const wallet = new Wallet(PRIVATE_KEY)
    expect(wallet.address).toBe(PUBLIC_KEY)
    const bob = new LocalhostWeb3Provider(process.env.AA_RPC_URL as string, wallet)
    await bob.ready
    expect(bob.wallet.address).toBe(PUBLIC_KEY)

    const { userOps: useropsPermissionless } = await createSpaceDappAndUserops(bob)
    const [smartAccount] = await useropsPermissionless.setup(bob.wallet)
    const senderPermissionless = smartAccount.address

    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'simple') {
        expect(senderPermissionless).toBe(simple.AA_ADDRESS)
    } else {
        expect(senderPermissionless).toBe(modular.AA_ADDRESS)
    }
})

test('Useroperations.getAbstractAccountAddress returns the correct address', async () => {
    const wallet = new Wallet(PRIVATE_KEY)
    const bob = new LocalhostWeb3Provider(process.env.AA_RPC_URL as string)
    await bob.ready
    const { userOps } = await createSpaceDappAndUserops(bob)
    const address = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await wallet.getAddress()) as Address,
    })
    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'simple') {
        expect(address).toBe(simple.AA_ADDRESS)
    } else {
        expect(address).toBe(modular.AA_ADDRESS)
    }
})
