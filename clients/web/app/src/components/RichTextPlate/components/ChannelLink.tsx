import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Channel, useSpaceData } from 'use-towns-client'
import { atoms } from 'ui/styles/atoms.css'
import { PATHS } from 'routes'
import { addressFromSpaceId } from 'ui/utils/utils'

export const ChannelLink = ({ channel }: { channel: Channel }) => {
    const spaceData = useSpaceData()
    const channelSlug = channel?.id
    return (
        <NavLink
            to={`/${PATHS.SPACES}/${addressFromSpaceId(spaceData?.id)}/${
                PATHS.CHANNELS
            }/${channelSlug}`}
            className={atoms({
                color: 'cta2',
            })}
        >
            #{channel?.label?.toLowerCase()}
        </NavLink>
    )
}

export const ChannelLinkForDisplay = ({
    channels,
    channelLabel,
}: {
    channels?: Channel[]
    channelLabel: string
}) => {
    const channel = useMemo(
        () => channels?.find((c) => c.label === channelLabel.slice(1)),
        [channels, channelLabel],
    )

    return (
        <ChannelLink
            channel={
                channel || {
                    id: channelLabel,
                    label: channelLabel,
                    isAutojoin: false,
                    isDefault: false,
                    hideUserJoinLeaveEvents: false,
                    disabled: false,
                }
            }
        />
    )
}
