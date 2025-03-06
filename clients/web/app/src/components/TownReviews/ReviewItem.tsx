import React from 'react'
import { Address, useGetRootKeyFromLinkedWallet, useUserLookup } from 'use-towns-client'
import { Box, Stack, Text } from '@ui'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'
import { useReviews } from 'hooks/useReviews'

export interface ReviewItemProps {
    review: ReturnType<typeof useReviews>['reviews'][number]
    showActions?: boolean
    renderActions?: (reviewId: string) => React.ReactNode
}

const AuthorDisplay = ({ address }: { address: string }) => {
    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({ walletAddress: address })
    const user = useUserLookup(rootKeyAddress ?? '')
    const name = !user ? shortAddress(address) : getPrettyDisplayName(user)

    return (
        <Box tooltip={address}>
            <Text strong>{name}</Text>
        </Box>
    )
}

export const ReviewItem: React.FC<ReviewItemProps> = ({
    review,
    showActions = false,
    renderActions,
}) => {
    const { id, author, rating, text, timestamp } = review

    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({
        walletAddress: author as Address,
    })

    return (
        <Stack position="relative">
            <Stack horizontal gap="sm" alignItems="start">
                <AvatarWithoutDot userId={rootKeyAddress} size="avatar_md" />
                <Stack grow gap="sm">
                    <ReviewStars rating={rating} size={16} />
                    <Text>{text}</Text>
                    <Stack horizontal gap="sm" alignItems="center">
                        <AuthorDisplay address={author} />
                        <Text color="gray2">{timestamp}</Text>
                    </Stack>
                </Stack>
            </Stack>

            {showActions && renderActions && (
                <Box
                    pointerEvents="auto"
                    position="absolute"
                    right="xs"
                    top="-x4"
                    zIndex="tooltips"
                >
                    {renderActions(id)}
                </Box>
            )}
        </Stack>
    )
}
