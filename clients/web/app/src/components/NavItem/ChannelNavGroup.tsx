import React, { useState } from 'react'
import { Badge, Box, Paragraph } from '@ui'
import { TextProps } from 'ui/components/Text/Text'

export const ChannelNavGroup = (props: {
    label: string
    children?: React.ReactNode
    badgeValue?: number
    dataTestId?: string
    onClick?: () => void
}) => {
    const { onClick } = props
    const [hovered, setHovered] = useState(false)
    const color = onClick ? (hovered ? 'default' : 'gray2') : 'gray2'
    return (
        <Box
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            paddingRight="sm"
            height="height_lg"
            style={{ transform: 'translateY(2px)' }}
            cursor={onClick ? 'pointer' : 'default'}
            color={color}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Box
                horizontal
                gap="sm"
                justifyContent="spaceBetween"
                alignItems="center"
                data-testid={props.dataTestId}
            >
                <Label>{props.label}</Label>
                {props.badgeValue ? <Badge value={props.badgeValue} /> : <></>}
            </Box>
            {props.children}
        </Box>
    )
}

const Label = (props: { children: React.ReactNode; color?: TextProps['color'] | undefined }) => (
    <Box paddingLeft="md" paddingY="sm">
        <Paragraph>{props.children}</Paragraph>
    </Box>
)
