import React from 'react'
import { Outlet } from 'react-router-dom'
import { Stack } from '@ui'
import { SpaceSettingsRolesNav } from '../SpaceSettingsRolesNav'
import { RoleSettingsTabs } from './RoleSettingsTabs'

export const RoleSettings = () => {
    return (
        <>
            <SpaceSettingsRolesNav />
            <Stack grow borderLeft="faint">
                <RoleSettingsTabs />
                <Stack grow padding="lg" maxWidth="1000">
                    <Outlet />
                </Stack>
            </Stack>
        </>
    )
}
