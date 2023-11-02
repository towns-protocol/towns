import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChannelDirectoryPanel } from './SpaceChannelDirectoryPanel'
import { DMChannelInfoPanel } from './DMChannelInfoPanel'

export const DMInfoPanelWrapper = () => {
    const [search] = useSearchParams()
    if (search.get('channel') !== null) {
        return <DMChannelInfoPanel />
    } else if (search.get('directory') !== null) {
        return <ChannelDirectoryPanel />
    }
    return undefined
}
