import React, { useEffect } from 'react'
import { useEvent } from 'react-use-event-hook'
import {
    TSigner,
    TransactionStatus,
    useCreateRoleTransaction,
    useDeleteRoleTransaction,
    useUpdateRoleTransaction,
} from 'use-zion-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { useSettingsRolesStore } from '../store/hooks/settingsRolesStore'
import { useSettingsTransactionsStore } from '../store/hooks/settingsTransactionStore'
import { ModifiedRole, modifiedRoleTypes } from '../store/hooks/useModifiedRoles'

export const TRANSACTION_HIDDEN_BUTTON = 'space-settings-transaction-hidden-button'

type TransactionHookProps = {
    role: ModifiedRole
    spaceId: string
}

// Each role that is being modified should have it's own transaction hook instance
// When the user clicks the main save button in the modal, it will trigger the hidden button within each of these component instances and kick off the transaction
// Yes, this is a bit goofy
export const TransactionHookInstance = (props: TransactionHookProps) => {
    // render different transaction hook components based off the role type b/c each transaction hook within outputs a bunch of logs even if that hook is not being used
    switch (props.role.type) {
        case modifiedRoleTypes.CreateRole:
            return <CreateRoleTransaction {...props} />
        case modifiedRoleTypes.UpdateRole:
            return <UpdateRoleTransaction {...props} />
        case modifiedRoleTypes.DeleteRole:
            return <DeleteRoleTransaction {...props} />
        default:
            throw new Error('Role type is not valid')
    }
}

const HiddenButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <button
            className={`${TRANSACTION_HIDDEN_BUTTON}`}
            tabIndex={-1}
            style={{
                position: 'absolute',
                visibility: 'hidden',
                top: 0,
                left: 0,
                width: 0,
                height: 0,
            }}
            onClick={onClick}
        >
            hidden transaction button
        </button>
    )
}

export const UpdateRoleTransaction = ({ role, spaceId }: TransactionHookProps) => {
    const {
        updateRoleTransaction: action,
        transactionHash,
        error,
        transactionStatus,
    } = useUpdateRoleTransaction()

    const onClick = useSetupTxStatesAndAction({
        error,
        transactionHash,
        transactionStatus,
        role,
        spaceId,
        transactionAction: (signer) => {
            action(
                spaceId,
                +role.metadata.id,
                role.metadata.name,
                role.metadata.permissions,
                role.metadata.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: t.tokenIds,
                    }),
                ),
                role.metadata.users,
                signer,
            )
        },
    })
    return <HiddenButton onClick={onClick} />
}

export const CreateRoleTransaction = ({ role, spaceId }: TransactionHookProps) => {
    const {
        createRoleTransaction: action,
        transactionHash,
        error,
        transactionStatus,
    } = useCreateRoleTransaction()

    const onClick = useSetupTxStatesAndAction({
        error,
        transactionHash,
        transactionStatus,
        role,
        spaceId,
        transactionAction: (signer) => {
            action(
                spaceId,
                role.metadata.name,
                role.metadata.permissions,
                role.metadata.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: t.tokenIds,
                    }),
                ),
                role.metadata.users,
                signer,
            )
        },
    })

    return <HiddenButton onClick={onClick} />
}

export const DeleteRoleTransaction = ({ role, spaceId }: TransactionHookProps) => {
    const {
        deleteRoleTransaction: action,
        transactionHash,
        transactionStatus,
        error,
    } = useDeleteRoleTransaction()

    const onClick = useSetupTxStatesAndAction({
        error,
        transactionHash,
        transactionStatus,
        role,
        spaceId,
        transactionAction: (signer) => {
            action(spaceId, +role.metadata.id, signer)
        },
    })

    return <HiddenButton onClick={onClick} />
}

// lib transaction hooks are designed to call a single transaction at a time
// but the UX requires that we call multiple transactions at once, so we need separate instances of each hook, and we need to track the status of each transaction
// this hook is used to
// 1. call the transaction
// 2. save the transaction status to app's transaction stores
// TODO: each transaction hook saves the transaciton to local storage when it's created. This hook can be simplified so that we only set the potential transaction status here, and not listen to any transaction statuses.
// Then higher up the hiearchy (see SpaceSettings.tsx), just listen for the transactions being stored locally. BUT first the transaction hooks also need to store relevant context data
function useSetupTxStatesAndAction({
    error,
    transactionHash,
    transactionStatus,
    role,
    spaceId,
    transactionAction,
}: TransactionHookProps & {
    error: Error | undefined
    transactionHash: string | undefined
    transactionStatus: TransactionStatus | undefined
    transactionAction: (signer: TSigner) => void
}) {
    const setPendingTransaction = useSettingsTransactionsStore(
        (state) => state.setPendingTransaction,
    )
    const setTransactionFailed = useSettingsTransactionsStore((state) => state.setTransactionFailed)
    const setPotentialTransaction = useSettingsTransactionsStore(
        (state) => state.setPotentialTransaction,
    )
    const removePotentialTransaction = useSettingsTransactionsStore(
        (state) => state.removePotentialTransaction,
    )
    const getSigner = useGetEmbeddedSigner()

    useEffect(() => {
        // once we have an error
        if (error) {
            // if the user rejects the transaction, let's assume for now that they don't want to save the role and remove it from the settings state entirely.
            // It's just a lot simpler that way
            if (
                typeof error.message === 'object' &&
                (error.message as { code: string }).code === 'ACTION_REJECTED'
            ) {
                removePotentialTransaction(role.metadata.id)
                useSettingsRolesStore.getState().resetRole(role.metadata.id)
            } else {
                // TODO: handle other errors
                // this likely needs more development. What do we want to happen when a transaction fails?
                setTransactionFailed(role.metadata.id, error)
            }
        }
    }, [error, removePotentialTransaction, role, setTransactionFailed])

    useEffect(() => {
        // user approved the transaction. It's not a potential transaction anymore
        if (transactionHash && transactionStatus === TransactionStatus.Pending) {
            setPendingTransaction(role.metadata.id, transactionHash)
        }
    }, [transactionHash, role, setPendingTransaction, transactionStatus])

    return useEvent(async () => {
        if (!spaceId) {
            return
        }
        const signer = await getSigner()
        if (!signer) {
            return
        }
        // when the user clicks "save", save the role to the settings state
        setPotentialTransaction(role)
        transactionAction(signer)
    })
}
