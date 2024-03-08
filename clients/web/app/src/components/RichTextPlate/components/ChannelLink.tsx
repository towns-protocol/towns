import React from 'react'
import { NavLink } from 'react-router-dom'
import { Channel, useSpaceData } from 'use-towns-client'
import { atoms } from 'ui/styles/atoms.css'
import { PATHS } from 'routes'

export const ChannelLink = ({ channel }: { channel: Channel }) => {
    const spaceData = useSpaceData()
    const spaceSlug = spaceData?.id
    const channelSlug = channel?.id
    return (
        <NavLink
            to={`/${PATHS.SPACES}/${spaceSlug}/${PATHS.CHANNELS}/${channelSlug}`}
            className={atoms({
                color: 'cta2',
            })}
        >
            #{channel?.label?.toLowerCase()}
        </NavLink>
    )
}
