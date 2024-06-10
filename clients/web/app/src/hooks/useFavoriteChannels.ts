import { useCallback, useMemo } from 'react'
import { useStore } from 'store/store'

export const useFavoriteChannels = () => {
    const { favoriteChannelIds, setFavoriteChannelIds } = useStore()

    const _favoriteChannelIds = useMemo(() => new Set(favoriteChannelIds), [favoriteChannelIds])
    const toggleFavoriteChannelId = useCallback(
        (channelId: string) => {
            if (_favoriteChannelIds.has(channelId)) {
                _favoriteChannelIds.delete(channelId)
            } else {
                _favoriteChannelIds.add(channelId)
            }
            setFavoriteChannelIds(Array.from(_favoriteChannelIds))
        },
        [_favoriteChannelIds, setFavoriteChannelIds],
    )
    const unfavoriteChannelId = useCallback(
        (channelId: string) => {
            _favoriteChannelIds.delete(channelId)
            setFavoriteChannelIds(Array.from(_favoriteChannelIds))
        },
        [_favoriteChannelIds, setFavoriteChannelIds],
    )
    return { favoriteChannelIds: _favoriteChannelIds, toggleFavoriteChannelId, unfavoriteChannelId }
}
