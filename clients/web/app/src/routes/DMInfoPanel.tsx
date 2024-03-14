import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { SpaceContextProvider } from 'use-towns-client'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { BrowseChannelsPanel } from '@components/BrowseChannelsPanel/BrowseChannelsPanel'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ChannelDirectoryPanel } from './SpaceChannelDirectoryPanel'
import { DMChannelInfoPanel } from './DMChannelInfoPanel'
import { GDMChannelPermissionsPanel } from './GDMChannelPermissions'
import { ChannelInvitePanel } from './ChannelInvitePanel'

export const DMInfoPanelWrapper = () => {
    const spaceId = useSpaceIdFromPathname()
    const [search] = useSearchParams()
    if (
        search.get(CHANNEL_INFO_PARAMS.DM_CHANNEL) !== null ||
        search.get(CHANNEL_INFO_PARAMS.GDM_CHANNEL) !== null
    ) {
        return <DMChannelInfoPanel />
    } else if (search.get(CHANNEL_INFO_PARAMS.DIRECTORY) !== null) {
        return <ChannelDirectoryPanel />
    } else if (search.get(CHANNEL_INFO_PARAMS.PERMISSIONS) !== null) {
        return <GDMChannelPermissionsPanel />
    } else if (search.get(CHANNEL_INFO_PARAMS.INVITE) !== null) {
        return <ChannelInvitePanel />
    } else if (search.get(CHANNEL_INFO_PARAMS.BROWSE_CHANNELS) !== null) {
        return (
            <SpaceContextProvider spaceId={spaceId}>
                <BrowseChannelsPanel />
            </SpaceContextProvider>
        )
    }
    return undefined
}
