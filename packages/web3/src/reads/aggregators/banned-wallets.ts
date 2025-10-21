import { Address, isAddress, zeroAddress } from 'viem'
import { BannedTokenIdsCache, BannedTokenIdsRequest } from '../cache/banned-token-id.cache'
import { OwnerOfTokenCache, OwnerOfTokenRequest } from '../cache/owner-of-token.cache'
import { ReadClient } from '../clients/readClient'
import { IsTokenBanned, IsTokenBannedCache } from '../cache/is-banned-token.cache'
import { dlogger } from '@towns-protocol/utils'
import BanningAbi from '@towns-protocol/generated/dev/abis/IBanning.abi'
import ERC721A from '@towns-protocol/generated/dev/abis/IERC721A.abi'
import ERC721AQueryableAbi from '@towns-protocol/generated/dev/abis/IERC721AQueryable.abi'
import { SpaceAddressFromSpaceId } from '../../utils/ut'

const logger = dlogger('csb:bannedWallets:debug')

export async function bannedWallets(args: {
    spaceId: string
    bannedTokenIdsCache: BannedTokenIdsCache
    ownerOfTokenCache: OwnerOfTokenCache
    readClient: ReadClient
}) {
    const { spaceId, bannedTokenIdsCache, ownerOfTokenCache, readClient } = args

    const spaceAddress = SpaceAddressFromSpaceId(spaceId)
    if (!isAddress(spaceAddress)) {
        throw new Error('Invalid space address')
    }

    const bannedTokenIds = await bannedTokenIdsCache.executeUsingCache(
        new BannedTokenIdsRequest(spaceId),
        async () => {
            return (
                await readClient.readContract({
                    address: spaceAddress,
                    abi: BanningAbi,
                    functionName: 'banned',
                })
            ).map((tokenId) => tokenId.toString())
        },
    )

    const ownerMap = new Map<string, Address>() // tokenId.toString() -> ownerAddress
    const tokenIdsToFetch: string[] = []

    // Check cache first
    for (const tokenId of bannedTokenIds) {
        const cacheKey = new OwnerOfTokenRequest(spaceId, tokenId.toString())
        const cachedOwner = ownerOfTokenCache.get(cacheKey)
        if (cachedOwner) {
            ownerMap.set(tokenId, cachedOwner)
        } else {
            tokenIdsToFetch.push(tokenId)
        }
    }

    // Fetch non-cached owners
    if (tokenIdsToFetch.length > 0) {
        // this should be multicalled by viem
        const results = await Promise.all(
            tokenIdsToFetch.map((tokenId) =>
                readClient.readContract({
                    address: spaceAddress,
                    abi: ERC721A,
                    functionName: 'ownerOf',
                    args: [BigInt(tokenId)],
                }),
            ),
        )

        try {
            results.forEach((address, index) => {
                const tokenId = tokenIdsToFetch[index]
                try {
                    if (address && address !== zeroAddress) {
                        ownerMap.set(tokenId.toString(), address)
                        ownerOfTokenCache.add(new OwnerOfTokenRequest(spaceId, tokenId), address)
                    } else {
                        logger.log(
                            `bannedWalletAddresses: Multicall: ownerOf call returned empty data for token ${tokenId.toString()} in space ${spaceId}`,
                        )
                    }
                } catch (decodeError) {
                    logger.error(
                        `bannedWalletAddresses: Multicall: Failed to decode ownerOf result for token ${tokenId.toString()} in space ${spaceId}`,
                        decodeError instanceof Error ? decodeError.message : String(decodeError),
                    )
                }
            })
        } catch (multiCallError) {
            logger.error(
                `Multicall execution failed for space ${spaceId}. This likely means one of the ownerOf calls reverted.`,
                multiCallError instanceof Error ? multiCallError.message : String(multiCallError),
            )
        }
    }

    return Array.from(new Set(ownerMap.values()))
}

export async function walletAddressIsBanned(
    args: {
        spaceId: string
        walletAddress: Address
        readClient: ReadClient
        isTokenBannedCache: IsTokenBannedCache
    },
    opts?: { skipCache?: boolean },
) {
    const { spaceId, walletAddress, readClient, isTokenBannedCache } = args

    const spaceAddress = SpaceAddressFromSpaceId(spaceId)
    if (!isAddress(spaceAddress)) {
        throw new Error('Invalid space address')
    }
    const tokenId = await readClient
        .readContract({
            address: spaceAddress,
            abi: ERC721AQueryableAbi,
            functionName: 'tokensOfOwner',
            args: [walletAddress],
        })
        .then((tokens) => tokens[0])

    const isBanned = await isTokenBannedCache.executeUsingCache(
        new IsTokenBanned(spaceId, tokenId.toString()),
        async () =>
            readClient.readContract({
                address: spaceAddress,
                abi: BanningAbi,
                functionName: 'isBanned',
                args: [tokenId],
            }),
        opts,
    )

    return isBanned
}
