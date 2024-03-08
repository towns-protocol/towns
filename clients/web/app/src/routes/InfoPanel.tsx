import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { CreateChannelPanel } from '@components/CreateChannelPanel/CreateChannelPanel'
import { BrowseChannelsPanel } from '@components/BrowseChannelsPanel/BrowseChannelsPanel'
import { ChannelDirectoryPanel } from './SpaceChannelDirectoryPanel'
import { ChannelInfoPanel } from './SpaceChannelInfoPanel'
import { SpaceInfoPanel } from './SpaceInfoPanel'
import { DMChannelInfoPanel } from './DMChannelInfoPanel'

const { CHANNEL, DIRECTORY, DM_CHANNEL, GDM_CHANNEL, BROWSE_CHANNELS, CREATE_CHANNEL } =
    CHANNEL_INFO_PARAMS

export const InfoPanelWrapper = () => {
    const [search] = useSearchParams()
    if (search.get(CHANNEL) !== null) {
        return <ChannelInfoPanel />
    } else if (search.get(DM_CHANNEL) !== null || search.get(GDM_CHANNEL) !== null) {
        return <DMChannelInfoPanel />
    } else if (search.get(DIRECTORY) !== null) {
        return <ChannelDirectoryPanel />
    } else if (search.get(CREATE_CHANNEL) !== null) {
        return <CreateChannelPanel />
    } else if (search.get(BROWSE_CHANNELS) !== null) {
        return <BrowseChannelsPanel />
    }
    return <SpaceInfoPanel />
}
