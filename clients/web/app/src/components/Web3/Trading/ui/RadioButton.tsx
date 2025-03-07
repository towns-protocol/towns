import React from 'react'
import { Box, FancyButton, IconName } from '@ui'
import { TextSprinkles } from 'ui/components/Text/Text.css'

export const RadioButton = (props: {
    label: string
    selected: boolean
    icon?: IconName
    color?: TextSprinkles['color']
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
                    layoutRoot
                    compact
                    borderRadius="full"
                    icon={props.icon}
                    iconSize="square_xs"
                    gap="none"
                    paddingX="sm"
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
