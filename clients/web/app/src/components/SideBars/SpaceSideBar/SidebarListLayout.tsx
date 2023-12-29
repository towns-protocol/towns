import React from 'react'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { MotionStack } from '@ui'

export const SidebarListLayout = <T,>(props: {
    label: string
    channels: T[]
    headerContent?: React.ReactNode
    itemRenderer: (channel: T) => React.ReactNode
}) =>
    props.channels.length ? (
        <MotionStack key={props.label}>
            <ChannelNavGroup label={props.label}>{props.headerContent}</ChannelNavGroup>
            {props.channels.map((channel) => props.itemRenderer(channel))}
        </MotionStack>
    ) : (
        <></>
    )
