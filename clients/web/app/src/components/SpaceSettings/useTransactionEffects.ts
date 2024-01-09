import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useOnTransactionUpdated } from 'use-zion-client'
import { useDefaultRolePath } from './useDefaultRolePath'
import { NEW_ROLE_ID_PREFIX } from './SpaceSettingsRolesNav'
import { Role } from './store/hooks/settingsRolesStore'
import { useSettingsTransactionsStore } from './store/hooks/settingsTransactionStore'

// this hook watches the transactions a user makes from the "save changes" modal
// it watches both for transactions that are stored in the settingsTransactionsStore,
// and those that are emitted by the blockchain via the useOnTransactionUpdated hook.
// it resets the store data when all transactions have been completed, and forces the roles to be refetched
export function useTransactionEffects({
    fetchedRoles,
    invalidateQuery,
}: {
    fetchedRoles: Role[] | undefined
    invalidateQuery: (() => Promise<void>) | undefined
}) {
    const { spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])
    const defaultPath = useDefaultRolePath()

    const setTransactionSuccess = useSettingsTransactionsStore(
        (state) => state.setTransactionSuccess,
    )
    const navigate = useNavigate()

    const { role: roleId } = useParams()

    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0

    // when a single transaction resolves, update the transaction store
    useOnTransactionUpdated(async (arg) => {
        const [id] =
            Object.entries(inProgressTransactions).find(([, data]) => {
                return data.hash === arg.hashOrUserOpHash
            }) ?? []
        if (id) {
            setTransactionSuccess(id)
        }
    })

    // watch all pending transactions. When they all resolve, refetch the roles and clear the store data
    useEffect(() => {
        const invalidateQueryAndSetSpace = async () => {
            if (!fetchedRoles?.length) {
                return
            }
            // clear the in progress transactions, they're finished
            useSettingsTransactionsStore.getState().saveToSettledAndClearInProgress()
            // refetch the roles
            await invalidateQuery?.()
            // if the user was on a new role screen, navigate to the default role
            if (roleId?.includes(NEW_ROLE_ID_PREFIX) && defaultPath) {
                navigate(defaultPath)
            }
        }

        if (!hasInProgressTransactions) {
            return
        }

        const allResolved = Object.values(inProgressTransactions).every((data) => {
            return data.status === 'success' || data.status === 'failed'
        })

        if (!allResolved) {
            return
        }

        invalidateQueryAndSetSpace()
    }, [
        defaultPath,
        fetchedRoles,
        fetchedRoles?.length,
        hasInProgressTransactions,
        inProgressTransactions,
        invalidateQuery,
        navigate,
        roleId,
        spaceId,
    ])
}
