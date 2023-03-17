import React from 'react'
import { NavLink } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import { Box, Card } from '@ui'
import { MenuItem } from '@components/Cards/MenuItem'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { Role } from './store/hooks/settingsRolesStore'

export const SpaceSettingsRolesNavItem = (props: {
    role: Role
    selected?: boolean
    onRemoveRole: (roleId: string) => void
}) => {
    const { role, selected } = props

    const onRemoveRole = useEvent(() => {
        props.onRemoveRole(role.id)
    })

    return (
        <>
            <CardOpener
                trigger="contextmenu"
                placement="pointer"
                render={<SpaceRoleNavCard onRemoveRole={onRemoveRole} />}
            >
                {({ triggerProps }) => {
                    return (
                        <NavLink
                            to={`../roles/${role.id}/permissions`}
                            relative="route"
                            {...triggerProps}
                        >
                            <SpaceSettingsNavItem selected={selected}>
                                {role.name}
                            </SpaceSettingsNavItem>
                        </NavLink>
                    )
                }}
            </CardOpener>
        </>
    )
}

export const SpaceRoleNavCard = (props: { onRemoveRole: () => void }) => {
    return (
        <Box position="relative">
            <Card border paddingY="sm" width="300" fontSize="md">
                <MenuItem icon="logout" color="cta1" onClick={props.onRemoveRole}>
                    Remove role
                </MenuItem>
            </Card>
        </Box>
    )
}
