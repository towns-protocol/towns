import React from 'react'
import { useTokenMetadata } from 'api/lib/collectionMetadata'
import { TokenAvatar, TokenAvatarProps } from './TokenAvatar'

type Props = {
    address: string
    size?: TokenAvatarProps['size']
} & Pick<TokenAvatarProps, 'layoutProps' | 'labelProps'>

// TokenAvatar that fetches metadata from NFT API
export function FetchedTokenAvatar({ address, size, labelProps, layoutProps }: Props) {
    const { data, isFetched, failureCount } = useTokenMetadata(address)
    // if there's a single failure, show the fallback content
    // a subsequent success will re-render the component and show the correct data
    const isLoading = isFetched ? false : failureCount === 0

    return (
        <TokenAvatar
            labelProps={labelProps}
            layoutProps={layoutProps}
            key={address}
            contractAddress={address ?? ''}
            isLoading={isLoading}
            imgSrc={data?.imageUrl}
            size={size ?? 'avatar_md'}
            label={data?.name}
        />
    )
}
