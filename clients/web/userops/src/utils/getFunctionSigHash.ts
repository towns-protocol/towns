import { ethers } from 'ethers'
import { FunctionHash } from '../types'
/**
 * should return a matching functionHash for paymaster proxy validation
 * TODO: proxy still uses function name, not sigHash
 */
export function getFunctionSigHash<ContractInterface extends ethers.utils.Interface>(
    _contractInterface: ContractInterface,
    functionHash: FunctionHash,
) {
    return functionHash
    // TODO: swap to this
    // const frag = contractInterface.getFunction(functionName)
    // return frag.format() // format sigHash
}
