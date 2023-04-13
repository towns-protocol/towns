import React, { useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import { Permission, useRoleDetails } from 'use-zion-client'
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
import { useAllRoleDetails } from 'hooks/useAllRoleDetails'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { useModifiedRoles } from './store/hooks/useModifiedRoles'
import { useSettingsTransactionsStore } from './store/hooks/settingsTransactionStore'
import { InProgressToast } from './notifications/InProgressToast'
import { ResultsToast } from './notifications/ResultsToast'
import { NavigateToFirstRoleOnEntry, useDefaultPath } from './NavigateToFirstRoleOnEntry'
import { useTransactionEffects } from './useTransactionEffects'

// Space settings relies on a couple stores and hook to keep track of the state of the space and the blockchain transactions
//
// settingsRolesStore: stores changes to the roles in the space and - the list of roles displayed in the UI is driven by this store
// useModifiedRoles: tracks the roles that are modified and need to be saved
// settingsTransactionStore: keeps track of the transactions that are in progress
//
// TODO: I think there are improvements to be made for this feature.
//
// 1. We should move away from the current route architecture, where each role has it's own dedicated route.
// It's a bit hard to work with becuase you're adding/deleting routes on the fly. We also have to wait for the role data to be fetched before determining the correct route to navigate to.
// Yes, we could prefetch, but I think it would be overall easier to work with if the roles were a single route
//
// 2. We're using react-query to fetch the roles, and invalidating the query when role transactions are made. Invalidating doesn't work exactly like I was expecting - individual queries are refetched and the UI rerenders when each updates.
// instead of the useQuery hooks, we should use imperative flow with queryClient.fetchQuery, or the like, and once transactions complete we can fetch all the roles again at once, wait for them all to resolve, and then update the UI
//
// 3. we should update the lib's transaciton hooks to so that the client can pass in whatever data they want to be stored in the lib's transaction store.
//
// 4. really needs tests
export const SpaceSettings = () => {
    const navigate = useNavigate()
    const { spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0
    const settledTransactions = useSettingsTransactionsStore((state) => state.settledTransactions)
    const defaultPath = useDefaultPath()

    const { data, invalidateQuery, isLoading: fetchedRolesLoading } = useAllRoleDetails(spaceId)
    const fetchedRoles = useMemo(
        () => data?.map(mapRoleStructToRole).filter((role): role is Role => !!role) ?? [],
        [data],
    )

    const { data: canEditSettings, isLoading: canEditLoading } = useHasPermission(
        Permission.ModifySpaceSettings,
    )

    // The lockedState blocks the user from interacting with the UI
    // they should not be able to interact with the settings while changes are being saved
    // after they are saved, they should not be able to interact with the settings until they give acknowledgement (clicking the toast)
    const lockedState = useMemo(() => {
        return hasInProgressTransactions || Object.values(settledTransactions).length > 0
    }, [hasInProgressTransactions, settledTransactions])

    const clearLockedState = useEvent(() => {
        useSettingsTransactionsStore.getState().clearTransactions()
    })

    const onClose = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceId}`)
    })

    // when user navigates away, clear the saved space data
    useEffect(() => {
        return () => {
            useSettingsRolesStore.getState().clearSpace()
            // TODO: just resetting the transactions store for now. Meaning user could navigate away and come back and have transactions still in progress and the UI wouldn't reflect their last changes. But that is for next iteration
            useSettingsTransactionsStore.getState().clearTransactions()
        }
    }, [])

    // update the roles store whenever new role data is fetched from blockchain
    // Happens on load and when new changes are saved and the data is refetched
    useEffect(() => {
        if (fetchedRolesLoading || !fetchedRoles) {
            return
        }
        // if any transactions are going on, wait until they're finished before update the store and UI
        if (hasInProgressTransactions) {
            return
        }

        useSettingsRolesStore.getState().setSpace({ spaceId, roles: fetchedRoles })
    }, [fetchedRoles, spaceId, hasInProgressTransactions, fetchedRolesLoading])

    useTransactionEffects({
        fetchedRoles,
        invalidateQuery,
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

    // TODO: should prefecth the roles data and navigate there directly
    const waitingForNavigation = !defaultPath

    return (
        <Stack horizontal grow minWidth="100%" position="relative" zIndex="ui" background="level1">
            <NavigateToFirstRoleOnEntry fetchedRolesLoading={fetchedRolesLoading} />

            <Stack minWidth="200">
                <Stack gap="sm" padding="sm">
                    <NavLink to={defaultPath ?? '.'}>
                        <SpaceSettingsNavItem selected icon="all">
                            Roles
                        </SpaceSettingsNavItem>
                    </NavLink>
                    {/*
                    // Hide the delete town button for now.
                    // Re-enable when this is implemented:
                    // https://linear.app/hnt-labs/issue/HNT-1050/as-a-user-i-should-be-able-to-delete-a-town
                    <SpaceSettingsNavItem icon="delete" color="error">
                        Delete Town
                    </SpaceSettingsNavItem>
                    */}
                </Stack>
            </Stack>

            {waitingForNavigation ? (
                <Stack grow centerContent borderLeft="faint" gap="md">
                    <Text>Loading roles</Text>
                    <ButtonSpinner />
                </Stack>
            ) : (
                <>
                    <Outlet />
                </>
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
                                opacity="0.9"
                                cursor="crosshair"
                            />
                        </Stack>
                    </FadeIn>
                )}
            </AnimatePresence>
            <ToastBar onMoreChangesClick={clearLockedState} />
        </Stack>
    )
}

function ToastBar({ onMoreChangesClick }: { onMoreChangesClick: () => void }) {
    const modifiedRoles = useModifiedRoles()

    return (
        <>
            <InProgressToast modifiedRoles={modifiedRoles} />
            <ResultsToast modifiedRoles={modifiedRoles} onMoreChangesClick={onMoreChangesClick} />
        </>
    )
}

export function mapRoleStructToRole(
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails'],
): Role | undefined {
    if (!roleDetails) {
        return
    }
    return {
        id: roleDetails.id.toString(),
        name: roleDetails.name,
        permissions: roleDetails.permissions,
        // NFT API data (both Alchemy and Infura) lowercase all their contract addresses
        // perhaps we should do the same in lib?
        tokens: roleDetails.tokens.map((t) => (t.contractAddress as string).toLowerCase()),
        users: roleDetails.users,
    }
}
