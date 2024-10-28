import { useMemo } from 'react'
import { Address } from 'use-towns-client'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useNfts } from 'hooks/useNfts'
import { TokenDataWithChainId } from '@components/Tokens/types'

export function useBaseNftsForTransfer(args: {
    walletAddress: Address | undefined
    enabled?: boolean
}) {
    const { walletAddress, enabled } = args
    const { baseChain, baseChainConfig } = useEnvironment()
    const baseChainId = baseChain.id
    const spaceOwnerAddress = baseChainConfig.addresses.spaceOwner

    const { nfts, ...rest } = useNfts({ walletAddress, enabled })

    const _nfts = useMemo(() => {
        return (
            nfts
                .filter((nft) => nft.chainId === baseChainId)
                // for now filtering out space owner nfts and following up in space ownership transfer work
                // all space owner nfts are named "Space Owner"
                // to map the owner nft to the space, need to use Architect contract, getSpaceByTokenId
                // which requires some shim work in River
                .filter((nft) => {
                    const isSpaceOwner =
                        // really old spaces pre-diamond are not going to be filtered b/c they have different address,
                        // would only happen for HNT peeps
                        nft.data.address.toLowerCase() === spaceOwnerAddress.toLowerCase()
                    return !isSpaceOwner
                })
                .map((nft) => {
                    return convertTokenDataWithChainIdToToken(nft)
                })
        )
    }, [nfts, baseChainId, spaceOwnerAddress])

    return useMemo(() => {
        return { nfts: _nfts, ...rest }
    }, [_nfts, rest])
}

export function convertTokenDataWithChainIdToToken(nft: TokenDataWithChainId): Token {
    return {
        ...nft,
        data: {
            ...nft.data,
            // this is for space owner nfts
            // label: nft.data.displayNft?.name ?? nft.data.label,
            openSeaCollectionUrl: nft.data.openSeaCollectionUrl ?? undefined,
            quantity: nft.data.quantity?.toString() ?? undefined,
            tokenId: nft.data.displayNft?.tokenId ?? undefined,
        },
    }
}
