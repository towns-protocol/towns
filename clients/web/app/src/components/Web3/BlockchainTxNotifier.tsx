import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
    BlockchainStoreTx,
    BlockchainTransactionType,
    Membership,
    useMyMembership,
    useOnTransactionUpdated,
} from 'use-towns-client'

import headlessToast, { Toast } from 'react-hot-toast/headless'
import { useSearchParams } from 'react-router-dom'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from './utils'

type ToastProps = {
    tx: BlockchainStoreTx
    /**
     * if onlyShowPending is true, the toast will appear in pending state and never dismiss
     * the component that is handling other toasts must dismiss toasts at the appropriate time to remove it
     */
    onlyShowPending?: boolean
    successMessage: string
    pendingMessage?: string
    errorMessage?: string
}

export function BlockchainTxNotifier() {
    const spaceId = useSpaceIdFromPathname()
    const myMembership = useMyMembership(spaceId ?? '')
    const isMember = myMembership === Membership.Join
    const { currentlyOpenPanel } = usePanelActions()

    useOnTransactionUpdated((tx) => {
        // these potential txs will show a toast that transitions from a pending to a success or failure state
        if (tx.status === 'potential') {
            switch (tx.type) {
                case BlockchainTransactionType.LinkWallet:
                    if (spaceId && !isMember) {
                        // skip b/c we can wallet link when on a public town page, and we handle there
                        return
                    }
                    generateToast({
                        tx,
                        pendingMessage: 'Linking wallet...',
                        successMessage: 'Wallet linked!',
                        onlyShowPending:
                            currentlyOpenPanel === CHANNEL_INFO_PARAMS.ROLE_RESTRICTED_CHANNEL_JOIN,
                    })
                    break
                case BlockchainTransactionType.UnlinkWallet:
                    if (spaceId && !isMember) {
                        // skip b/c we can wallet link when on a public town page, and we handle there
                        return
                    }
                    generateToast({
                        tx,
                        pendingMessage: 'Unlinking wallet...',
                        successMessage: 'Unlinked your wallet!',
                        onlyShowPending:
                            currentlyOpenPanel === CHANNEL_INFO_PARAMS.ROLE_RESTRICTED_CHANNEL_JOIN,
                    })
                    break
                case BlockchainTransactionType.CreateRole: {
                    const roleName = tx.data?.roleName
                    generateToast({
                        tx,
                        pendingMessage: `Creating ${roleName} role...`,
                        successMessage: `${roleName} role created!`,
                    })
                    break
                }
                case BlockchainTransactionType.UpdateRole: {
                    const roleName = tx.data?.roleName

                    generateToast({
                        tx,
                        pendingMessage: `Updating ${roleName} role...`,
                        successMessage: `${roleName} role updated! Any permission changes may take up to 15 minutes to reflect.`,
                    })
                    break
                }
                case BlockchainTransactionType.DeleteRole: {
                    generateToast({
                        tx,
                        pendingMessage: `Deleting role...`,
                        successMessage: `Role deleted!`,
                    })
                    break
                }
                case BlockchainTransactionType.EditSpaceMembership: {
                    generateToast({
                        tx,
                        pendingMessage: 'Updating membership...',
                        successMessage: 'Membership updated!',
                    })
                    break
                }
                case BlockchainTransactionType.PrepayMembership: {
                    generateToast({
                        tx,
                        pendingMessage: 'Adding prepaid seats...',
                        successMessage: `${tx.data?.supply} Prepaid seats added!`,
                    })
                    break
                }
                case BlockchainTransactionType.EditChannel:
                    generateToast({
                        tx,
                        pendingMessage: 'Updating channel...',
                        successMessage: 'Channel updated!',
                    })
                    break
                default:
                    break
            }
        }

        // these 'failure' only show a toast when tx fails
        // this is mostly for transactions that are use older UX patterns, where a toast is not shown when pending or for success
        // these can be converted over to the nex UX pattern and put in the potential switch above
        if (tx.status === 'failure') {
            switch (tx.type) {
                case BlockchainTransactionType.CreateChannel: {
                    generateToast({
                        tx,
                        successMessage: '',
                        errorMessage: mapToErrorMessage(tx.error),
                    })
                    break
                }
                default:
                    break
            }
        }
    })

    return null
}

function generateToast(props: ToastProps) {
    const status = props.tx.status
    return popupToast(({ toast: t }) => <MonitoringNotification {...props} toast={t} />, {
        // because we don't want to start a duration timer until the tx is no longer pending
        duration: status === 'pending' || status === 'potential' ? Infinity : 8_000,
    })
}

function MonitoringNotification(props: ToastProps & { toast: Toast }) {
    const {
        tx,
        successMessage,
        pendingMessage = 'Transaction pending...',
        errorMessage = tx.error ? mapToErrorMessage(tx.error) : undefined,
        toast,
        /**
         * if onlyShowPending is true, the toast will appear in pending state and never dismiss
         * the component that is handling other toasts must dismiss toasts at the appropriate time to remove it
         */
        onlyShowPending,
    } = props

    const [status, setStatus] = useState(tx.status)

    const [searchParams, setSearchParams] = useSearchParams()
    const rolesParam = searchParams.get('roles')

    const { message } = useMemo(() => {
        return status === 'pending' || status === 'potential'
            ? {
                  message: pendingMessage,
              }
            : status === 'success'
            ? {
                  message: successMessage,
              }
            : {
                  message: errorMessage,
              }
    }, [status, pendingMessage, successMessage, errorMessage])

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useOnTransactionUpdated(
        (_tx) => {
            if (_tx.id !== tx.id) {
                return
            }

            if (onlyShowPending && (_tx.status === 'failure' || _tx.status === 'success')) {
                return
            }

            setStatus(_tx.status)

            const dismissTimer = () => {
                timeoutRef.current && clearTimeout(timeoutRef.current)
                timeoutRef.current = setTimeout(() => {
                    headlessToast.dismiss(toast.id)
                }, 8_000)
            }

            if (_tx.status === 'failure') {
                const errorMessage = mapToErrorMessage(_tx.error)
                // if the error message is empty, the user rejected the tx and we can dismiss the toast
                if (!errorMessage) {
                    headlessToast.dismiss(toast.id)
                    return
                }
                dismissTimer()
            } else if (_tx.status === 'success') {
                onSuccess()
                dismissTimer()
            }
        },
        () => {
            timeoutRef.current && clearTimeout(timeoutRef.current)
        },
    )

    const onSuccess = useCallback(() => {
        switch (tx.type) {
            case BlockchainTransactionType.CreateRole:
            case BlockchainTransactionType.DeleteRole:
            case BlockchainTransactionType.UpdateRole:
                // navigate back to the role list panel
                if (rolesParam) {
                    searchParams.set('roles', '')
                    setSearchParams(searchParams)
                }
                break

            default:
                break
        }
    }, [rolesParam, searchParams, setSearchParams, tx.type])

    // prevent flash when user rejects tx
    if (tx.status === 'failure' && !errorMessage) {
        return null
    }

    if (tx.status === 'success') {
        return <StandardToast.Success toast={toast} message={message ?? ''} />
    }

    if (tx.status === 'failure') {
        return <StandardToast.Error toast={toast} message={message ?? ''} />
    }

    return <StandardToast.Pending toast={toast} message={message ?? ''} />
}
