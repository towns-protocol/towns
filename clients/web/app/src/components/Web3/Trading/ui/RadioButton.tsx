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
                position="absolute"
                background={props.selected ? 'cta1' : undefined}
                rounded="full"
                style={{ height: 'calc(100% + 2px)', width: 'calc(100% + 2px)', inset: '-1px' }}
            />
            <Box grow position="relative" width="100%">
                <FancyButton
                    layoutRoot
                    compact
                    borderRadius="full"
                    icon={props.icon}
                    iconSize="square_xs"
                    gap="xs"
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
