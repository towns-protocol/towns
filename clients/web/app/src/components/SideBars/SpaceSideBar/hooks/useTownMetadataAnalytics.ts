import { useCallback, useEffect, useRef } from 'react'
import { SpaceData } from 'use-towns-client'
import { Analytics } from 'hooks/useAnalytics'
import { ChannelMenuItem, MixedChannelMenuItem } from 'hooks/useSortedChannels'

export function useTownMetadataAnalytics(
    favoriteChannels: MixedChannelMenuItem[],
    unreadChannels: MixedChannelMenuItem[],
    readChannels: ChannelMenuItem[],
    space: SpaceData,
) {
    const sendChannelAnalytics = useCallback(
        (channels: MixedChannelMenuItem[] | ChannelMenuItem[]) => {
            channels.forEach((channel) => {
                Analytics.getInstance().track('town metadata', {
                    spaceId: space.id,
                    spaceName: space.name,
                    channelId: channel.id,
                    channelName: channel.label,
                })
            })
        },
        [space.id, space.name],
    )

    const previousChannelsRef = useRef<{
        favoriteChannels: MixedChannelMenuItem[]
        unreadChannels: MixedChannelMenuItem[]
        readChannels: ChannelMenuItem[]
    }>({
        favoriteChannels: [],
        unreadChannels: [],
        readChannels: [],
    })

    useEffect(() => {
        if (!areChannelsEqual(favoriteChannels, previousChannelsRef.current.favoriteChannels)) {
            sendChannelAnalytics(favoriteChannels)
            previousChannelsRef.current.favoriteChannels = favoriteChannels
        }
    }, [favoriteChannels, sendChannelAnalytics])

    useEffect(() => {
        if (!areChannelsEqual(unreadChannels, previousChannelsRef.current.unreadChannels)) {
            sendChannelAnalytics(unreadChannels)
            previousChannelsRef.current.unreadChannels = unreadChannels
        }
    }, [unreadChannels, sendChannelAnalytics])

    useEffect(() => {
        if (!areChannelsEqual(readChannels, previousChannelsRef.current.readChannels)) {
            sendChannelAnalytics(readChannels)
            previousChannelsRef.current.readChannels = readChannels
        }
    }, [readChannels, sendChannelAnalytics])
}

function areChannelsEqual(
    channels1: MixedChannelMenuItem[] | ChannelMenuItem[],
    channels2: MixedChannelMenuItem[] | ChannelMenuItem[],
): boolean {
    if (channels1.length !== channels2.length) {
        return false
    }

    return channels1.every((channel1, index) => {
        const channel2 = channels2[index]
        return channel1.id === channel2.id && channel1.label === channel2.label
    })
}
