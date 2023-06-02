import React, { useEffect, useMemo, useRef } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import { Permission, useHasPermission } from 'use-zion-client'
import { PATHS } from 'routes'
import { IconButton, Stack, Text } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn } from '@components/Transitions'
import { useAuth } from 'hooks/useAuth'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { useModifiedRoles } from './store/hooks/useModifiedRoles'
import { useSettingsTransactionsStore } from './store/hooks/settingsTransactionStore'
import { InProgressToast } from './notifications/InProgressToast'
import { ResultsToast } from './notifications/ResultsToast'
import { useDefaultRolePath } from './useDefaultRolePath'

export const SpaceSettings = () => {
    const navigate = useNavigate()
    const { spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])
    const defaultPath = useDefaultRolePath()
    const { loggedInWalletAddress } = useAuth()

    const { hasPermission: canEditSettings, isLoading: canEditLoading } = useHasPermission({
        spaceId: spaceId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

    const onClose = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceId}`)
    })

    const hasNavigated = useRef(false)

    // when the first role id is obtained, navigate to it once
    useEffect(() => {
        if (defaultPath && !hasNavigated.current) {
            hasNavigated.current = true
            navigate(defaultPath)
        }
    }, [defaultPath, navigate])

    // when user navigates away, clear the saved space data
    useEffect(() => {
        return () => {
            useSettingsRolesStore.getState().clearSpace()
            // TODO: just resetting the transactions store for now. Meaning user could navigate away and come back and have transactions still in progress and the UI wouldn't reflect their last changes. But that is for next iteration
            useSettingsTransactionsStore.getState().clearTransactions()
        }
    }, [])

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
        <Stack horizontal grow minWidth="100%" position="relative" zIndex="ui" background="level1">
            <Stack minWidth="200">
                <Stack gap="sm" padding="sm">
                    <NavLink to={defaultPath ?? '.'} data-testid="space-settings-roles-button">
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

            <Outlet />

            <Stack position="topRight" padding="lg">
                <IconButton icon="close" color="default" onClick={onClose} />
            </Stack>
            <ToastBar />
        </Stack>
    )
}

function ToastBar() {
    const modifiedRoles = useModifiedRoles()
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0
    const settledTransactions = useSettingsTransactionsStore((state) => state.settledTransactions)

    // The lockedState blocks the user from interacting with the UI
    // they should not be able to interact with the settings while changes are being saved
    // after they are saved, they should not be able to interact with the settings until they give acknowledgement (clicking the toast)
    const lockedState = useMemo(() => {
        return hasInProgressTransactions || Object.values(settledTransactions).length > 0
    }, [hasInProgressTransactions, settledTransactions])

    const clearLockedState = useEvent(() => {
        useSettingsTransactionsStore.getState().clearTransactions()
    })

    return (
        <>
            {lockedState && (
                <FadeIn>
                    <Stack absoluteFill centerContent>
                        <Stack absoluteFill background="level1" opacity="0.9" cursor="crosshair" />
                    </Stack>
                </FadeIn>
            )}
            <InProgressToast modifiedRoles={modifiedRoles} />
            <ResultsToast modifiedRoles={modifiedRoles} onMoreChangesClick={clearLockedState} />
        </>
    )
}
