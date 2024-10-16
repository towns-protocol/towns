import React from 'react'
import { useRoles } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { Icon, Stack } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { PanelButton } from '@components/Panel/PanelButton'
import { Analytics } from 'hooks/useAnalytics'
import { SingleRolePanel } from './SingleRolePanel'
import { isNumeric } from './utils'

export function RolesPanel() {
    const [searchParams] = useSearchParams()
    const currentRole = searchParams.get('roles')
    const isSingleRolePanel = currentRole === 'new' || isNumeric(currentRole ?? '')

    return (
        <Stack position="absolute" top="none" left="none" right="none" bottom="none">
            {isSingleRolePanel ? <SingleRolePanel /> : <RolesListPanel />}
        </Stack>
    )
}

function RolesListPanel() {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const [searchParams, setSearchParams] = useSearchParams()

    const { spaceRoles, isLoading } = useRoles(spaceIdFromPath)
    const onNewRoleClick = useEvent(() => {
        searchParams.set('roles', 'new')
        setSearchParams(searchParams)
        Analytics.getInstance().track('clicked new role in town info panel', {
            spaceId: spaceIdFromPath,
        })
    })

    return (
        <Panel label="Roles">
            <Stack gap grow>
                {isLoading ? (
                    <Stack centerContent grow>
                        <ButtonSpinner />
                    </Stack>
                ) : (
                    <>
                        {/* filter out the minter role, its in another panel */}
                        {spaceRoles
                            ?.filter((role) => role.roleId !== 1)
                            .map((role) => {
                                return (
                                    <RoleListItem
                                        key={role.roleId}
                                        roleId={role.roleId}
                                        name={role.name}
                                    />
                                )
                            })}
                        <PanelButton onClick={onNewRoleClick}>
                            <Icon type="plus" /> Create Role
                        </PanelButton>
                    </>
                )}
            </Stack>
        </Panel>
    )
}

function RoleListItem(props: { roleId: number; name: string }) {
    const [searchParams, setSearchParams] = useSearchParams()
    const spaceIdFromPath = useSpaceIdFromPathname()

    const onClick = useEvent(() => {
        searchParams.set('roles', props.roleId.toString())
        setSearchParams(searchParams)
        Analytics.getInstance().track('clicked on a role in the town info panel', {
            spaceId: spaceIdFromPath,
        })
    })
    return (
        <Stack>
            <PanelButton onClick={onClick}>{props.name}</PanelButton>
        </Stack>
    )
}
