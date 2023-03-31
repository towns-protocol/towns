import React, { useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useRoles } from 'use-zion-client'
import { Stack, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { SpaceSettingsRolesNav } from '../SpaceSettingsRolesNav'
import { RoleSettingsTabs } from './RoleSettingsTabs'
import { useSettingsRolesStore } from '../store/hooks/settingsRolesStore'

export const RoleSettings = () => {
    const { spaceSlug = '' } = useParams()
    const modifiedSpace = useSettingsRolesStore((state) => state.modifiedSpace)
    const { spaceRoles, isLoading } = useRoles(decodeURIComponent(spaceSlug))

    const isEmpty = useMemo(() => {
        if (isLoading || modifiedSpace?.roles?.length) {
            return false
        }
        return spaceRoles?.length === 0
    }, [spaceRoles?.length, isLoading, modifiedSpace?.roles?.length])

    if (isLoading) {
        return (
            <Stack grow centerContent borderLeft="faint" gap="md">
                <Text>Loading roles</Text>
                <ButtonSpinner />
            </Stack>
        )
    }

    return (
        <>
            <SpaceSettingsRolesNav />
            <Stack grow borderLeft="faint">
                {isEmpty ? (
                    <Stack grow centerContent>
                        <Text>No roles found</Text>
                    </Stack>
                ) : (
                    <>
                        <RoleSettingsTabs />
                        <Stack grow padding="lg" maxWidth="1000">
                            <Outlet />
                        </Stack>
                    </>
                )}
            </Stack>
        </>
    )
}
