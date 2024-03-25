import React, { useCallback } from 'react'
import { useFavoriteChannels } from 'hooks/useFavoriteChannels'
import { Box, Icon } from '@ui'
import { favoriteStyle, favoriteStyleAutoHide } from './FavoriteChannelButton.css'

export const FavoriteChannelButton = (props: {
    channelId: string
    favorite: boolean
    isUnreadSection: boolean
}) => {
    const { favorite, channelId, isUnreadSection } = props
    const { toggleFavoriteChannelId } = useFavoriteChannels()
    const onToggleFavorite = useCallback(
        (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
            event.preventDefault()
            event.stopPropagation()
            toggleFavoriteChannelId(channelId)
        },
        [channelId, toggleFavoriteChannelId],
    )
    const tooltip = favorite ? 'Remove from Favorites' : 'Add to Favorites'
    const forceDisplay = favorite && isUnreadSection
    return (
        <Box tooltip={tooltip}>
            <Icon
                className={forceDisplay ? favoriteStyle : favoriteStyleAutoHide}
                type={favorite ? 'starFilled' : 'star'}
                size="square_xs"
                color="gray2"
                onClick={onToggleFavorite}
            />
        </Box>
    )
}
