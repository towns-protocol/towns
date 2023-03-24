import React from 'react'
import { BoxProps, Icon, IconName, Stack } from '@ui'

export const SpaceSettingsNavItem = (props: { icon?: IconName; selected?: boolean } & BoxProps) => {
    const { icon, children, selected = false, ...boxProps } = props
    return (
        <Stack
            horizontal
            cursor={!selected ? 'pointer' : undefined}
            gap="sm"
            padding="md"
            background={{ hover: 'level2', default: selected ? 'level2' : undefined }}
            borderRadius="sm"
            alignItems="center"
            {...boxProps}
        >
            {icon && <Icon type={icon} size="square_xs" />}
            {children}
        </Stack>
    )
}
