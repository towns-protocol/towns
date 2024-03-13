import React from 'react'
import { Badge, Box, Paragraph } from '@ui'

export const ChannelNavGroup = (props: {
    label: string
    children?: React.ReactNode
    badgeValue?: number
}) => (
    <Box
        horizontal
        alignItems="center"
        justifyContent="spaceBetween"
        paddingRight="sm"
        height="height_lg"
        style={{ transform: 'translateY(2px)' }}
    >
        <Box horizontal gap="sm" justifyContent="spaceBetween" alignItems="center">
            <Label>{props.label}</Label>
            {props.badgeValue ? <Badge value={props.badgeValue} /> : <></>}
        </Box>
        {props.children}
    </Box>
)

const Label = (props: { children: React.ReactNode }) => (
    <Box paddingLeft="md" paddingY="sm">
        <Paragraph color="gray2">{props.children}</Paragraph>
    </Box>
)
