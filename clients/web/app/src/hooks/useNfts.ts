import { useLinkedWalletsForWallet } from 'use-towns-client'
import { isDefined } from '@river-build/sdk'
import { useMemo } from 'react'
import { useCollectionsForAddressesAcrossNetworks, useNftMetadata } from 'api/lib/tokenContracts'
import { TokenType } from '@components/Tokens/types'

export const useNfts = (walletAddress?: string) => {
    const { data: wallets = [] } = useLinkedWalletsForWallet({
        walletAddress,
        enabled: !!walletAddress,
    })
    const { data: nfts, isFetching } = useCollectionsForAddressesAcrossNetworks({
        wallets: wallets.concat(walletAddress ?? []),
        enabled: true,
    })

    return {
        nfts: nfts.filter(isDefined).filter((nft) => nft.data.type === TokenType.ERC721),
        isFetching,
    }
}

export const useResolveNft = ({
    walletAddress,
    info,
}: {
    walletAddress: string
    info: { chainId: number; tokenId: string; contractAddress: string } | undefined
}) => {
    const { data: metadata } = useNftMetadata(info)
    const linkedWallets = useLinkedWalletsForWallet({ walletAddress, enabled: !!info })

    const nft = useMemo(() => {
        if (!metadata?.data.media || metadata.data.media.length === 0 || !linkedWallets.data) {
            return undefined
        }

        const lowerCasedWallets = linkedWallets.data.map((w) => w.toLowerCase())
        const lowerCasedOwners = metadata.data.owners.map((w) => w.toLowerCase())

        const isOwner = lowerCasedOwners.some((owner) => lowerCasedWallets.includes(owner))
        if (!isOwner) {
            return undefined
        }
        return {
            title: metadata.data.title,
            description: metadata.data.description,
            image: metadata.data.media[0],
        }
    }, [metadata, linkedWallets])

    return nft
}
