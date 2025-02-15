import { ethers } from 'ethers'
import { erc20Abi } from 'viem'

export function generateApproveAmountCallData(spender: string, amount: string): string {
    const erc20Interface = new ethers.utils.Interface(erc20Abi)
    return erc20Interface.encodeFunctionData('approve', [spender, amount])
}
