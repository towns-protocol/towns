import React, { useEffect, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useRoleDetails, useRoles } from 'use-zion-client'
import { BigNumber } from 'ethers'
import { Stack, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useAllRoleDetails } from 'hooks/useAllRoleDetails'
import { SpaceSettingsRolesNav } from '../SpaceSettingsRolesNav'
import { RoleSettingsTabs } from './RoleSettingsTabs'
import { Role, useSettingsRolesStore } from '../store/hooks/settingsRolesStore'
import { useSettingsTransactionsStore } from '../store/hooks/settingsTransactionStore'
import { useTransactionEffects } from '../useTransactionEffects'

// Role settings relies on a couple stores and hook to keep track of the state of the space and the blockchain transactions
// settingsRolesStore: stores changes to the roles in the space and - the list of roles displayed in the UI is driven by this store
// useModifiedRoles: tracks the roles that are modified and need to be saved
// settingsTransactionStore: keeps track of the transactions that are in progress
// TODO: I think there are improvements to be made for this feature.
//
// 1. We're using react-query to fetch the roles, and invalidating the query when role transactions are made. Invalidating doesn't work exactly like I was expecting - individual queries are refetched and the UI rerenders when each updates.
// instead of the useQuery hooks, we should use imperative flow with queryClient.fetchQuery, or the like, and once transactions complete we can fetch all the roles again at once, wait for them all to resolve, and then update the UI
//
// 2. we should update the lib's transaciton hooks to so that the client can pass in whatever data they want to be stored in the lib's transaction store.
//
// 3. really needs tests
export const RoleSettings = () => {
    const { spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])
    const modifiedSpace = useSettingsRolesStore((state) => state.modifiedSpace)
    const { spaceRoles, isLoading } = useRoles(decodeURIComponent(spaceSlug))
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0

    const { data, invalidateQuery, isLoading: fetchedRolesLoading } = useAllRoleDetails(spaceId)
    const fetchedRoles = useMemo(
        () => data?.map(mapRoleStructToRole).filter((role): role is Role => !!role) ?? [],
        [data],
    )

    const isEmpty = useMemo(() => {
        if (isLoading || modifiedSpace?.roles?.length) {
            return false
        }
        return spaceRoles?.length === 0
    }, [spaceRoles?.length, isLoading, modifiedSpace?.roles?.length])

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

    if (fetchedRolesLoading) {
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
        // NFT API data (both Alchemy and Infura) lowercase all their contract addresses
        // perhaps we should do the same in lib?
        tokens: roleDetails.tokens.map((t) => {
            return {
                contractAddress: (t.contractAddress as string).toLowerCase(),
                tokenIds: t.tokenIds.map((id) => (id as BigNumber).toNumber()),
            }
        }),
        users: roleDetails.users,
    }
}
