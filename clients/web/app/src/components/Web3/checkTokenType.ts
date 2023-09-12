import { useContractRead } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { Address, isAddress, parseAbi } from 'viem'
import { useMemo } from 'react'
import { TokenType } from '@components/Tokens/types'

const ERC165Abi = parseAbi([
    'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
])

const interfaceIds = {
    erc1155: '0xd9b67a26',
    erc721: '0x80ac58cd',
} as const

type InterfaceId = (typeof interfaceIds)[keyof typeof interfaceIds]

function readConfig(
    address: Address,
    interfaceId: InterfaceId,
): {
    address: Address
    abi: typeof ERC165Abi
    functionName: 'supportsInterface'
    args: [InterfaceId]
    enabled: boolean
} {
    return {
        address,
        abi: ERC165Abi,
        functionName: 'supportsInterface',
        args: [interfaceId],
        enabled: isAddress(address),
    }
}

export function useCheckTokenType({ address }: { address: Address }) {
    const erc1155Config = useMemo(() => readConfig(address, interfaceIds.erc1155), [address])
    const { data: ERC1155Data } = useContractRead(erc1155Config)

    const erc721Config = useMemo(() => readConfig(address, interfaceIds.erc721), [address])
    const { data: ERC721Data } = useContractRead(erc721Config)

    return useMemo(() => {
        if (ERC1155Data) {
            return TokenType.ERC1155
        }
        if (ERC721Data) {
            return TokenType.ERC721
        }
        // catch all, we might need to add more checks here - wagmi exports erc20ABI if needed
        return TokenType.ERC20
    }, [ERC1155Data, ERC721Data])
}

export async function getTokenType({ address }: { address: Address }) {
    if (!isAddress(address)) {
        return
    }
    const ERC1155Data = await readContract(readConfig(address, interfaceIds.erc1155))
    const ERC721Data = await readContract(readConfig(address, interfaceIds.erc721))

    if (ERC1155Data) {
        return TokenType.ERC1155
    }
    if (ERC721Data) {
        return TokenType.ERC721
    }
    return TokenType.ERC20
}
