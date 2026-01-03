import type { Address, Hex } from 'viem'
import { encodeFunctionData } from 'viem'
import { simpleAccountAbi } from '../abis/simpleAccountAbi'
import { MODULAR_ACCOUNT_STORAGE } from '../constants'

// ABI for the initialize function on SemiModularAccountBytecode
// This function is called during upgradeToAndCall to set up the new owner
const initializeAbi = [
    {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const

export function encodeUpgrade(
    smartAccountAddress: Address,
    owner: Address,
): { to: Address; data: Hex } {
    const initializeData = encodeFunctionData({
        abi: initializeAbi,
        functionName: 'initialize',
        args: [owner],
    })

    const data = encodeFunctionData({
        abi: simpleAccountAbi,
        functionName: 'upgradeToAndCall',
        args: [MODULAR_ACCOUNT_STORAGE, initializeData],
    })

    return { to: smartAccountAddress, data }
}
