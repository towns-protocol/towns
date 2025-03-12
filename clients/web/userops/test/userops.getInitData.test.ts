import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { Wallet } from 'ethers'
import { createSpaceDappAndUserops } from './utils'
// this private key is fine for testing, it's from a test privy account
const PRIVATE_KEY = '09892cb15045f5989457e72dd4c7321f29d1dcb93b9f90d78da6fc433852a367'
const PUBLIC_KEY = '0xE6b4E8299D6abB4027Ba08eB67cA81011366f193'
const AA_ADDRESS = '0x768f8EF9daab26D725Ff27386B0220d99C09ca13'

test('UserOperations initializes with the correct sender', async () => {
    const wallet = new Wallet(PRIVATE_KEY)
    expect(wallet.address).toBe(PUBLIC_KEY)
    const bob = new LocalhostWeb3Provider(process.env.AA_RPC_URL as string, wallet)
    await bob.ready
    expect(bob.wallet.address).toBe(PUBLIC_KEY)

    const { userOps: useropsPermissionless } = await createSpaceDappAndUserops(bob)
    const [smartAccount] = await useropsPermissionless.setup(bob.wallet)
    const senderPermissionless = smartAccount.address
    expect(senderPermissionless).toBe(AA_ADDRESS)
})

test('Useroperations.getAbstractAccountAddress returns the correct address', async () => {
    const wallet = new Wallet(PRIVATE_KEY)
    const bob = new LocalhostWeb3Provider(process.env.AA_RPC_URL as string)
    await bob.ready
    const { userOps } = await createSpaceDappAndUserops(bob)
    const address = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await wallet.getAddress()) as Address,
    })
    expect(address).toBe(AA_ADDRESS)
})
