import React, { useCallback, useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useMultipleRoleDetails,
    useOnTransactionEmitted,
    useRoleDetails,
    useRoles,
} from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { PATHS } from 'routes'

import { IconButton, Stack, Text } from '@ui'
import {
    Role,
    useSettingsRolesStore,
} from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { FadeIn } from '@components/Transitions'
import { useHasPermission } from 'hooks/useHasPermission'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { useModifiedRoles } from './store/hooks/useModifiedRoles'
import { useSettingsTransactionsStore } from './store/hooks/settingsTransactionStore'
import { InProgressToast } from './notifications/InProgressToast'
import { ResultsToast } from './notifications/ResultsToast'

// Space settings relies on a couple stores and hook to keep track of the state of the space and the blockchain transactions
//
// settingsRolesStore: stores changes to the roles in the space
// useModifiedRoles: tracks the roles that are modified and need to be saved
// settingsTransactionStore: keeps track of the transactions that are in progress
export const SpaceSettings = () => {
    const { role: roleId, spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])
    const space = useSettingsRolesStore((state) => state.modifiedSpace)
    const { data: rolesWithDetails, invalidateQuery } = useGetAllRoleDetails(spaceId)
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const settledTransactions = useSettingsTransactionsStore((state) => state.settledTransactions)
    const setTransactionSuccess = useSettingsTransactionsStore(
        (state) => state.setTransactionSuccess,
    )
    const modifiedRoles = useModifiedRoles()
    const navigate = useNavigate()

    const getDefaultRole = useSettingsRolesStore((state) => state.getDefaultRole)
    const defaultPath = `roles/${getDefaultRole()?.id}/permissions`

    const clearStoresAndRevalidateQuery = useCallback(async () => {
        useSettingsTransactionsStore.getState().saveToSettledAndClearInProgress()
        await invalidateQuery?.()
        useSettingsRolesStore.getState().clearSpace()
    }, [invalidateQuery])

    const { data: canEditSettings, isLoading: canEditLoading } = useHasPermission(
        Permission.ModifySpaceSettings,
    )

    // when transactions are in progress, or they have completed, until user gives some sort of confirmation
    const lockedState = useMemo(() => {
        return (
            Object.values(inProgressTransactions).length > 0 ||
            Object.values(settledTransactions).length > 0
        )
    }, [inProgressTransactions, settledTransactions])

    const onClose = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceId}`)
    })

    // when user navigates away, clear the saved space data
    useEffect(() => {
        return () => {
            useSettingsRolesStore.getState().clearSpace()
            // TODO: just resetting the transactions store for now. Meaning user could navigate away and come back and have transactions still in progress and the UI wouldn't reflect their last changes. But that is for next iteration
            useSettingsTransactionsStore.getState().saveToSettledAndClearInProgress()
            useSettingsTransactionsStore.getState().clearSettled()
        }
    }, [])

    // when first loading the space, set the initial state of the store
    useEffect(() => {
        if (!rolesWithDetails) {
            return
        }
        useSettingsRolesStore.getState().setIntitialState({ spaceId, roles: rolesWithDetails })
    }, [rolesWithDetails, spaceId])

    // when the transactions are all resolved
    useEffect(() => {
        if (Object.keys(inProgressTransactions).length === 0) {
            return
        }

        const allResolved = Object.values(inProgressTransactions).every((data) => {
            return data.status === 'success' || data.status === 'failed'
        })

        if (!allResolved) {
            return
        }

        clearStoresAndRevalidateQuery()
    }, [inProgressTransactions, lockedState, clearStoresAndRevalidateQuery])

    // redirect if not found
    useEffect(() => {
        if (space && !roleId) {
            navigate(defaultPath)
        }
    }, [defaultPath, navigate, roleId, space])

    // when a transaction resolves, update the transaction store
    useOnTransactionEmitted(async (arg) => {
        const [id] =
            Object.entries(inProgressTransactions).find(([key, data]) => {
                return data.hash === arg.hash
            }) ?? []
        if (id) {
            setTransactionSuccess(id)
        }
    })

    if (canEditLoading) {
        return (
            <Stack grow centerContent borderLeft="faint" gap="md">
                <Text>Checking permissions</Text>
                <ButtonSpinner />
            </Stack>
        )
    }

    if (!canEditSettings) {
        return (
            <Stack absoluteFill centerContent>
                <h3>You cannot edit this town&apos;s settings.</h3>
            </Stack>
        )
    }

    return (
        <Stack horizontal grow minWidth="100%">
            <Stack minWidth="200">
                <Stack gap="sm" padding="sm">
                    <SpaceSettingsNavItem selected icon="all">
                        <NavLink to={defaultPath}>Roles</NavLink>
                    </SpaceSettingsNavItem>
                    <SpaceSettingsNavItem icon="delete" color="error">
                        Delete Space
                    </SpaceSettingsNavItem>
                </Stack>
            </Stack>
            {!rolesWithDetails ? (
                <Stack grow centerContent borderLeft="faint" gap="md">
                    <Text>Loading roles</Text>
                    <ButtonSpinner />
                </Stack>
            ) : (
                <Outlet />
            )}

            <Stack position="topRight" padding="lg">
                <IconButton icon="close" color="default" onClick={onClose} />
            </Stack>
            <AnimatePresence>
                {lockedState && (
                    <FadeIn>
                        <Stack absoluteFill centerContent>
                            <Stack
                                absoluteFill
                                background="level1"
                                opacity="0.8"
                                cursor="crosshair"
                            />
                        </Stack>
                    </FadeIn>
                )}
            </AnimatePresence>
            <InProgressToast modifiedRoles={modifiedRoles} />
            <ResultsToast modifiedRoles={modifiedRoles} />
        </Stack>
    )
}

function mapRoleStructToRole(
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails'],
): Role | undefined {
    if (!roleDetails) {
        return
    }
    return {
        id: roleDetails.id.toString(),
        name: roleDetails.name,
        permissions: roleDetails.permissions,
        tokens: roleDetails.tokens.map((t) => t.contractAddress as string),
        users: roleDetails.users,
    }
}

function useGetAllRoleDetails(spaceId: string) {
    const { spaceRoles: _roles, isLoading: rolesLoading } = useRoles(decodeURIComponent(spaceId))

    const roledIds = useMemo(() => _roles?.map((r) => r.roleId?.toNumber()) ?? [], [_roles])
    const {
        data: _rolesDetails,
        isLoading: detailsLoading,
        invalidateQuery,
    } = useMultipleRoleDetails(decodeURIComponent(spaceId), roledIds)
    return useMemo(() => {
        if (!_rolesDetails || rolesLoading || detailsLoading) {
            return {}
        }
        return {
            data: _rolesDetails?.map(mapRoleStructToRole).filter((role): role is Role => !!role),
            invalidateQuery,
        }
    }, [_rolesDetails, rolesLoading, detailsLoading, invalidateQuery])
}
