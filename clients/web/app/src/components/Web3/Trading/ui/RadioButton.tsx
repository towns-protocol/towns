import React from 'react'
import { Box, FancyButton, IconName } from '@ui'

export const RadioButton = (props: {
    label: string
    selected: boolean
    icon?: IconName
    onClick: () => void
}) => {
    return (
        <Box horizontal grow flexBasis="none" key={props.label} position="relative">
            <Box
                position="absolute"
                background={props.selected ? 'cta1' : undefined}
                rounded="full"
                style={{ inset: '-2px' }}
            />
            <Box grow position="relative" width="100%">
                <FancyButton
                    borderRadius="full"
                    icon={props.icon}
                    iconSize="square_xs"
                    gap="xs"
                    paddingX="sm"
                    color="greenBlue"
                    onClick={props.onClick}
                >
                    {props.label}
                </FancyButton>
            </Box>
        </Box>
    )
}
