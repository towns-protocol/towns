import { useMemo } from 'react'
import { useChannelId, useSpaceData } from 'use-towns-client'
import { useNavigate } from 'react-router'
import { PATHS } from 'routes'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
import { useSortedChannels } from 'hooks/useSortedChannels'
import { addressFromSpaceId } from 'ui/utils/utils'

export const RegisterChannelShortcuts = () => {
    const space = useSpaceData()
    const { favoriteChannels, unreadChannels, readChannels } = useSortedChannels({
        spaceId: space?.id,
    })

    const channels = useMemo(
        () => [...unreadChannels, ...favoriteChannels, ...readChannels],
        [unreadChannels, favoriteChannels, readChannels],
    )

    const channelId = useChannelId()

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const incrementChannel = (increment: -1 | 1) => {
        if (!space?.id) {
            return
        }
        const currentChannelIndex = channels.findIndex((s) => s.id === channelId)
        const numChannels = channels.length
        const index = (currentChannelIndex + increment + numChannels) % numChannels

        navigate(
            `/${PATHS.SPACES}/${addressFromSpaceId(space.id)}/${PATHS.CHANNELS}/${
                channels[index].id
            }/`,
        )
    }

    useShortcut('NavigateToPreviousChannel', () => {
        incrementChannel(-1)
    })
    useShortcut('NavigateToNextChannel', () => {
        incrementChannel(+1)
    })

    useShortcut('DisplayChannelInfo', () => {
        if (!space?.id) {
            return
        }

        const path = createLink({
            spaceId: space.id,
            channelId: channelId,
            panel: 'channelInfo',
        })
        if (path) {
            navigate(path)
        }
    })

    useShortcut('DisplayChannelDirectory', () => {
        if (!space?.id) {
            return
        }
        const path = createLink({
            spaceId: space.id,
            channelId: channelId,
            panel: 'channelDirectory',
        })
        if (path) {
            navigate(path)
        }
    })

    return null
}
