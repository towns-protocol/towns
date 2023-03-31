import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChannelDirectoryPanel } from './SpaceChannelDirectoryPanel'
import { ChannelInfoPanel } from './SpaceChannelInfoPanel'
import { SpaceInfoPanel } from './SpaceInfoPanel'

export const InfoPanelWrapper = () => {
    const [search] = useSearchParams()
    if (search.get('channel') !== null) {
        return <ChannelInfoPanel />
    } else if (search.get('directory') !== null) {
        return <ChannelDirectoryPanel />
    }
    return <SpaceInfoPanel />
}
