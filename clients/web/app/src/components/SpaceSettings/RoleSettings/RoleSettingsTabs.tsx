import { motion } from 'framer-motion'
import React from 'react'
import { NavLink, useMatch } from 'react-router-dom'
import { PATHS } from 'routes'
import { Box, BoxProps, Stack } from '@ui'

export const RoleSettingsTabs = () => {
    return (
        <Stack horizontal gap="sm" padding="sm" borderBottom="faint">
            <RoleSettingsTabItem
                selected
                to="permissions"
                data-testid="role-settings-permissions-tab"
            >
                Permissions
            </RoleSettingsTabItem>
            <RoleSettingsTabItem data-testid="role-settings-members-tab" to="members">
                Members
            </RoleSettingsTabItem>
            <RoleSettingsTabItem data-testid="role-settings-display-tab" to="display">
                Display
            </RoleSettingsTabItem>
        </Stack>
    )
}

const RoleSettingsTabItem = (props: { selected?: boolean; to: string } & BoxProps) => {
    const matches = useMatch(`${PATHS.SPACES}/:space/settings/roles/:role/:tab`)

    const selected = matches?.params.tab === props.to

    const { children, ...boxProps } = props
    return (
        <NavLink to={props.to}>
            <Stack padding="md" paddingBottom="sm" {...boxProps} gap="sm">
                <Box color={{ hover: 'default', default: selected ? 'default' : 'gray2' }}>
                    {children}
                </Box>
                {selected ? (
                    <MotionBox layout grow background="inverted" height="2" layoutId="bar" />
                ) : (
                    <Box grow background="none" height="2" />
                )}
            </Stack>
        </NavLink>
    )
}

const MotionBox = motion(Box)
