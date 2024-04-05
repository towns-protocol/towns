import React from 'react'
import { useRoles } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { Icon, Stack } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { PanelButton } from '@components/Panel/PanelButton'
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

    const onClick = useEvent(() => {
        searchParams.set('roles', props.roleId.toString())
        setSearchParams(searchParams)
    })
    return (
        <Stack>
            <PanelButton onClick={onClick}>{props.name}</PanelButton>
        </Stack>
    )
}
