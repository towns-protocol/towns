import React from 'react'
import { Box, FancyButton, IconName } from '@ui'
import { TextSprinkles } from 'ui/components/Text/Text.css'

export const RadioButton = (props: {
    label: string
    selected: boolean
    icon?: IconName
    color?: TextSprinkles['color']
    compact?: boolean
    onClick: () => void
}) => {
    return (
        <Box horizontal grow flexBasis="none" key={props.label} position="relative">
            <Box
                grow
                position="relative"
                width="100%"
                borderRadius="full"
                color={props.color}
                style={{
                    borderStyle: 'solid',
                    borderWidth: 1,
                    borderColor: props.selected ? 'inherit' : 'transparent',
                }}
            >
                <FancyButton
                    noLayout
                    compact="x4"
                    borderRadius="full"
                    icon={props.icon}
                    iconSize={props.compact ? 'square_xxs' : 'square_xs'}
                    gap={props.compact ? 'xxs' : 'sm'}
                    paddingX={props.compact ? 'xxs' : 'sm'}
                    paddingRight="sm"
                    color={props.color}
                    background="level2"
                    onClick={props.onClick}
                >
                    {props.label}
                </FancyButton>
            </Box>
        </Box>
    )
}
