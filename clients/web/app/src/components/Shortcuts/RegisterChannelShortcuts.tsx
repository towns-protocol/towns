import { useMemo } from 'react'
import { useChannelId, useMyChannels, useSpaceData } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { useShortcut } from 'hooks/useShortcut'
import { PATHS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'

export const RegisterChannelShortcuts = () => {
    const space = useSpaceData()
    const groups = useMyChannels(space)
    const channels = useMemo(() => groups.flatMap((c) => c.channels), [groups])
    const channelId = useChannelId()?.networkId

    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const incrementChannel = (increment: -1 | 1) => {
        if (!space?.id) {
            return
        }
        const currentChannelIndex = channels.findIndex((s) => s.id.networkId === channelId)
        const numChannels = channels.length

        const index = (currentChannelIndex + increment + numChannels) % numChannels
        navigate(`/${PATHS.SPACES}/${space.id.slug}/${PATHS.CHANNELS}/${channels[index].id.slug}/`)
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
            spaceId: space.id.networkId,
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
            spaceId: space.id.networkId,
            channelId: channelId,
            panel: 'channelDirectory',
        })
        if (path) {
            navigate(path)
        }
    })

    return null
}
