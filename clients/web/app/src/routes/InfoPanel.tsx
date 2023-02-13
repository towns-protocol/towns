import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChannelInfoPanel } from './SpaceChannelInfoPanel'
import { SpaceInfoPanel } from './SpaceInfoPanel'

export const InfoPanelWrapper = () => {
    const [search] = useSearchParams()
    const isChannel = search.get('channel') !== null

    if (isChannel) {
        return <ChannelInfoPanel />
    }
    return <SpaceInfoPanel />
}
