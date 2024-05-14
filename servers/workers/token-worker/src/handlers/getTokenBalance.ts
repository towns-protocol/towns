import { Address } from 'viem'
import { generatePublicClients } from '../utils'
import { TokenType } from '../types'
import { getTokenType } from './getTokenType'
import { Environment } from 'worker-common'
import { erc1155Abi, erc20Abi, erc721Abi } from '../abis'

type BalanceOfArgs = {
    walletAddress: Address
    token: Token
    alchemyApiKey: string
    supportedChainIds: number[]
}

type Token = {
    address: Address
    chainId: number
    type: TokenType
    tokenIds: number[]
    quantity: number
}
type TokenBalance = {
    tokenAddress: Address
    tokenIds?: { id: number; balance: number }[] // TODO: ERC1155
    balance?: number
    error?: Error | undefined
}

/**
 * check all linked wallets across all supported networks for the given token
 */
export async function getTokenBalance({
    token,
    walletAddresses,
    alchemyApiKey,
    supportedChainIds,
}: {
    token: Token
    walletAddresses: Address[]
    alchemyApiKey: string
    environment: Environment
    supportedChainIds: number[]
}): Promise<TokenBalance> {
    const type = await getTokenType(token.address, supportedChainIds, alchemyApiKey)

    switch (type) {
        case TokenType.ERC1155: {
            const promises = walletAddresses.map(async (addr) => {
                const tokenIds = token.tokenIds

                const tokenIdBalances = tokenIds.map(async (id) => {
                    const _id = id
                    const { result } = await balanceOfErc1155({
                        token,
                        tokenId: _id,
                        walletAddress: addr,
                        alchemyApiKey,
                        supportedChainIds: supportedChainIds,
                    })

                    if (result) {
                        return {
                            tokenAddress: token.address,
                            id: _id,
                            balance: result,
                        }
                    }
                })

                const balances = (await Promise.all(tokenIdBalances)).filter(
                    (
                        b,
                    ): b is {
                        id: number
                        balance: bigint
                        tokenAddress: Address
                    } => b !== undefined,
                )
                if (balances.length) {
                    return balances
                }
                throw new Error(
                    `No erc1155 balance found for token: ${token.address}, wallet: ${addr}`,
                )
            })

            const { result, error: _error } = await anyOrError(promises)
            return {
                tokenAddress: token.address,
                tokenIds: result?.map((r) => ({ id: r.id, balance: Number(r.balance) })) ?? [],
                error: _error,
            }
        }
        case TokenType.ERC721: {
            const promises = walletAddresses.map(async (addr) => {
                const { result, error } = await balanceOfErc721({
                    token: token,
                    walletAddress: addr,
                    alchemyApiKey,
                    supportedChainIds,
                })
                if (result) {
                    return result
                }
                throw error
            })

            const { result, error: _error } = await anyOrError(promises)
            const { balance, error } = getBalanceFromResult(result, _error)

            return {
                tokenAddress: token.address,
                balance: Number(balance),
                error,
            }
        }
        case TokenType.ERC20: {
            try {
                const promises = walletAddresses.map(async (addr) => {
                    const { result, error } = await balanceOfErc20({
                        token: token,
                        walletAddress: addr,
                        alchemyApiKey,
                        supportedChainIds,
                    })
                    if (result) {
                        return result
                    }
                    throw error
                })

                const { result, error: _error } = await anyOrError(promises)
                const { balance, error } = getBalanceFromResult(result, _error)

                return {
                    tokenAddress: token.address,
                    balance: Number(balance),
                    error,
                }
            } catch (error) {
                console.error(`[checkWalletForTokens] ERC20`, error)
                return {
                    tokenAddress: token.address,
                    balance: 0,
                }
            }
        }
        default:
            console.error(`[checkWalletForTokens] Unknown token type`, type)
            return {
                tokenAddress: token.address,
                balance: 0,
            }
    }
}

export async function balanceOfErc1155({
    token,
    walletAddress,
    tokenId,
    alchemyApiKey,
    supportedChainIds,
}: BalanceOfArgs & {
    tokenId: number
}) {
    const clients = generatePublicClients(supportedChainIds, alchemyApiKey)
    const readContracts = clients.map((client) => client.readContract)
    const promises = readContracts.map((rc) => {
        const balance = rc({
            address: token.address,
            abi: erc1155Abi,
            functionName: 'balanceOf',
            args: [walletAddress, BigInt(tokenId)],
        })
        if (balance) {
            return balance
        }
        throw new Error(
            `No erc1155 balance found for wallet: ${walletAddress}, contractAddress ${token.address}`,
        )
    })

    return anyOrError(promises)
}

export async function balanceOfErc721({
    token,
    walletAddress,
    alchemyApiKey,
    supportedChainIds,
}: BalanceOfArgs) {
    const clients = generatePublicClients(supportedChainIds, alchemyApiKey)
    const readContracts = clients.map((client) => client.readContract)
    const promises = readContracts.map(async (rc) => {
        const balance = await rc({
            address: token.address,
            abi: erc721Abi,
            functionName: 'balanceOf',
            args: [walletAddress],
        })
        if (balance) {
            return balance
        }
        throw new Error(
            `No erc721 balance found for wallet: ${walletAddress}, contractAddress ${token.address}`,
        )
    })

    return anyOrError(promises)
}

export async function balanceOfErc20({
    token,
    walletAddress,
    alchemyApiKey,
    supportedChainIds,
}: BalanceOfArgs) {
    const clients = generatePublicClients(supportedChainIds, alchemyApiKey)
    const readContracts = clients.map((client) => client.readContract)
    const promises = readContracts.map((rc) => {
        const balance = rc({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress],
        })
        if (balance) {
            return balance
        }
        throw new Error(
            `No erc20 balance found for wallet: ${walletAddress}, contractAddress ${token.address}`,
        )
    })

    return anyOrError(promises)
}

function getBalanceFromResult(
    result: bigint | undefined,
    error: Error | undefined,
): {
    balance: bigint
    error: Error | undefined
} {
    if (error instanceof AggregateError) {
        return { balance: 0n, error: undefined }
    }
    return { balance: result ?? 0n, error }
}

async function anyOrError<T>(promises: Promise<T>[]) {
    let result: T | undefined
    let error: Error | undefined
    try {
        result = await Promise.any(promises)
    } catch (err) {
        error = err as Error
    }

    return { result, error }
}
