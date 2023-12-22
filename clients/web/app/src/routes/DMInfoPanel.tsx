import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ChannelDirectoryPanel } from './SpaceChannelDirectoryPanel'
import { DMChannelInfoPanel } from './DMChannelInfoPanel'
import { GDMChannelPermissionsPanel } from './GDMChannelPermissions'
import { ChannelInvitePanel } from './ChannelInvitePanel'

export const DMInfoPanelWrapper = () => {
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
    }
    return undefined
}
