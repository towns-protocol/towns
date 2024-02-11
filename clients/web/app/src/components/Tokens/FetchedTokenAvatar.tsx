import React, { useMemo } from 'react'
import { useTokenMetadata } from 'api/lib/collectionMetadata'
import { TokenAvatar, TokenAvatarProps } from './TokenAvatar'

type Props = {
    address: string
    size?: TokenAvatarProps['size']
    label?: string
    /**
     * set to true to override the label with 'Unknown NFT' when the metadata is not available
     */
    showUnknownLabel?: boolean
} & Pick<
    TokenAvatarProps,
    'layoutProps' | 'labelProps' | 'tokenIds' | 'noLabel' | 'avatarToggleClasses'
>

// TokenAvatar that fetches metadata from NFT API - either from cached owner collection data, or for the inidividual collection - see useTokenMetadata
export function FetchedTokenAvatar({
    address,
    size,
    labelProps,
    layoutProps,
    tokenIds,
    noLabel,
    showUnknownLabel,
    avatarToggleClasses,
}: Props) {
    const { data, isFetched, failureCount } = useTokenMetadata(address)
    // if there's a single failure, show the fallback content
    // a subsequent success will re-render the component and show the correct data
    const isLoading = isFetched ? false : failureCount === 0
    const _tokenIds = useMemo(() => tokenIds ?? [], [tokenIds])
    const _showUnknownLabel = showUnknownLabel && !isLoading && !data?.label

    return (
        <TokenAvatar
            labelProps={labelProps}
            layoutProps={layoutProps}
            key={address}
            contractAddress={address ?? ''}
            tokenIds={_tokenIds}
            isLoading={isLoading}
            imgSrc={data?.imgSrc ?? undefined}
            size={size ?? 'avatar_md'}
            label={_showUnknownLabel ? 'Unknown NFT' : data?.label}
            noLabel={noLabel}
            avatarToggleClasses={avatarToggleClasses}
        />
    )
}
