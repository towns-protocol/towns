import React from 'react'
import { Outlet } from 'react-router'
import { Channel } from '@components/Channel/Channel'
import { SpaceChannelWrapper } from '@components/Channel/ChannelWrapper'

type Props = {
    onTouchClose?: () => void
    channelId?: string
    preventAutoFocus?: boolean
    hideHeader?: boolean
}

export const SpacesChannel = (props: Props) => {
    return (
        <SpaceChannelWrapper channelId={props.channelId}>
            <Channel {...props} />
        </SpaceChannelWrapper>
    )
}

export const SpacesChannelRoute = () => {
    return (
        <SpaceChannelWrapper>
            <Outlet />
        </SpaceChannelWrapper>
    )
}
