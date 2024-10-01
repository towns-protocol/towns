import { BundlerJsonRpcProvider } from 'userop'
import { Contract } from 'ethers'
const abi = ['function supportsInterface(bytes4 interfaceId) external view returns (bool)']

export async function isERC721(
    contractAddress: string,
    provider: BundlerJsonRpcProvider,
): Promise<boolean> {
    const ERC721_INTERFACE_ID = '0x80ac58cd'
    const contract = new Contract(contractAddress, abi, provider)
    return contract.supportsInterface(ERC721_INTERFACE_ID)
}

export async function isERC1155(
    contractAddress: string,
    provider: BundlerJsonRpcProvider,
): Promise<boolean> {
    const ERC1155_INTERFACE_ID = '0xd9b67a26'
    const contract = new Contract(contractAddress, abi, provider)
    return contract.supportsInterface(ERC1155_INTERFACE_ID)
}
