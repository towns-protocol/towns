import React from 'react'
import { Address, useGetRootKeyFromLinkedWallet, useUserLookup } from 'use-towns-client'
import { Box, Stack, Text } from '@ui'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'
import { useReviews } from 'hooks/useReviews'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

export interface ReviewItemProps {
    review: ReturnType<typeof useReviews>['reviews'][number]
    showActions?: boolean
    renderActions?: (reviewId: string) => React.ReactNode
    clickableUser?: boolean
    handleOpenProfile?: () => void
}

const AuthorDisplay = ({
    address,
    clickableUser,
    handleOpenProfile,
}: {
    address: string
    clickableUser?: boolean
    handleOpenProfile?: () => void
}) => {
    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({ walletAddress: address })
    const user = useUserLookup(rootKeyAddress ?? '')
    const name = !user ? shortAddress(address) : getPrettyDisplayName(user)

    return (
        <Box
            tooltip={address}
            cursor={clickableUser ? 'pointer' : 'default'}
            onClick={handleOpenProfile}
        >
            <Text strong>{name}</Text>
        </Box>
    )
}

export const ReviewItem: React.FC<ReviewItemProps> = ({
    review,
    showActions = false,
    renderActions,
    clickableUser = false,
}) => {
    const { id, author, rating, text, timestamp } = review
    const { openPanel } = usePanelActions()
    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({
        walletAddress: author as Address,
    })

    const handleOpenProfile = () => {
        if (clickableUser && rootKeyAddress) {
            openPanel('profile', { profileId: author })
        }
    }

    return (
        <Stack position="relative">
            <Stack horizontal gap="sm" alignItems="start">
                <Box cursor={clickableUser ? 'pointer' : 'default'} onClick={handleOpenProfile}>
                    <AvatarWithoutDot userId={rootKeyAddress} size="avatar_md" />
                </Box>
                <Stack grow gap="sm">
                    <ReviewStars rating={rating} size={16} />
                    <Text>{text}</Text>
                    <Stack horizontal gap="sm" alignItems="center">
                        <AuthorDisplay
                            address={author}
                            clickableUser={clickableUser}
                            handleOpenProfile={handleOpenProfile}
                        />
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
