import { erc20ABI, erc721ABI, useContractRead } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { Address, isAddress, parseAbi } from 'viem'
import { useMemo } from 'react'
import { TokenType } from '@components/Tokens/types'

const erc165ABI = parseAbi([
    'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
])

const erc1155ABI = parseAbi([
    'function balanceOf(address _owner, uint256 _id) external view returns (uint256)',
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
    abi: typeof erc165ABI
    functionName: 'supportsInterface'
    args: [InterfaceId]
    enabled: boolean
} {
    return {
        address,
        abi: erc165ABI,
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

type BalanceOfArgs = {
    contractAddress: Address
    walletAddress: Address
}

export async function balanceOfErc1155({
    contractAddress,
    walletAddress,
    id,
}: BalanceOfArgs & {
    id: number
}) {
    return readContract({
        address: contractAddress,
        abi: erc1155ABI,
        functionName: 'balanceOf',
        args: [walletAddress, BigInt(id)],
    })
}

export async function balanceOfErc721({ contractAddress, walletAddress }: BalanceOfArgs) {
    return readContract({
        address: contractAddress,
        abi: erc721ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
    })
}

export async function balanceOfErc20({ contractAddress, walletAddress }: BalanceOfArgs) {
    return readContract({
        address: contractAddress,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
    })
}
