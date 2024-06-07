import React from 'react'
import { useUserLookupContext } from 'use-towns-client'
import { Text, Tooltip } from '@ui'
import { useResolveEnsName } from 'api/lib/ensNames'
import { useResolveNft } from 'hooks/useNfts'
import { vars } from 'ui/styles/vars.css'

export const VerifiedOnChainAssetTooltip = (props: { userId: string | undefined }) => {
    const { userId } = props
    const { lookupUser } = useUserLookupContext()
    const user = userId ? lookupUser(userId) : undefined
    const { resolvedEnsName } = useResolveEnsName({ userId: userId, ensAddress: user?.ensAddress })
    const resolvedNft = useResolveNft({ walletAddress: userId ?? '', info: user?.nft })

    const text =
        resolvedNft && resolvedEnsName
            ? 'Verified ENS & NFT profile picture'
            : resolvedNft
            ? 'Verified NFT Profile Picture'
            : resolvedEnsName
            ? 'Verified ENS Name'
            : undefined
    if (!text) {
        return null
    }

    return (
        <Tooltip centerContent background="level2">
            <Text
                style={{
                    background: `linear-gradient(90deg, ${vars.color.tone.cta1}, ${vars.color.tone.cta2})`,
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    padding: '4px',
                }}
                shrink={false}
            >
                {text}
            </Text>
        </Tooltip>
    )
}
