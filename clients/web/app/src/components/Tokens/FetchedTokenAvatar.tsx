import React, { useMemo } from 'react'
import { useTokenMetadata } from 'api/lib/collectionMetadata'
import { useGetPioneerNftAddress } from 'hooks/useGetPioneerNftAddress'
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

// TokenAvatar that fetches metadata from NFT API
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
    const _showUnknownLabel = showUnknownLabel && !isLoading && !data?.name
    const pioneerAddress = useGetPioneerNftAddress()

    return (
        <TokenAvatar
            labelProps={labelProps}
            layoutProps={layoutProps}
            key={address}
            contractAddress={address ?? ''}
            tokenIds={_tokenIds}
            isLoading={isLoading}
            imgSrc={data?.imageUrl}
            size={size ?? 'avatar_md'}
            label={
                _showUnknownLabel
                    ? pioneerAddress?.toLowerCase() === address.toLowerCase()
                        ? 'Pioneer'
                        : 'Unknown NFT'
                    : data?.name
            }
            noLabel={noLabel}
            avatarToggleClasses={avatarToggleClasses}
        />
    )
}
