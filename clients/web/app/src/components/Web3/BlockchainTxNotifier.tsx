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
import { TransferAssetTransactionContext } from 'use-towns-client/dist/client/TownsClientTypes'
import { BigNumber } from 'ethers'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, Props as StandardToastProps } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { formatUnits } from 'hooks/useBalance'
import { shortAddress } from 'ui/utils/utils'
import { baseScanUrl, mapToErrorMessage } from './utils'

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
    onCtaClick?: (updatedTx: BlockchainStoreTx) => void
} & Omit<StandardToastProps, 'toast' | 'message' | 'onCtaClick'>

export function BlockchainTxNotifier() {
    const spaceId = useSpaceIdFromPathname()
    const myMembership = useMyMembership(spaceId ?? '')
    const isMember = myMembership === Membership.Join
    const { currentlyOpenPanel } = usePanelActions()
    const { baseChain } = useEnvironment()

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

                case BlockchainTransactionType.TransferAsset: {
                    const data = tx.data as TransferAssetTransactionContext['data']

                    let successMessage: string = 'Transfer complete!'
                    if (data?.value) {
                        try {
                            successMessage = `${formatUnits(
                                BigNumber.from(data.value).toBigInt(),
                            )} ETH was sent to ${shortAddress(data.recipient)}`
                        } catch (error) {
                            console.error(error)
                        }
                    } else {
                        const label = data?.assetLabel ?? data?.contractAddress
                        const recipient = data?.recipient
                            ? `to ${shortAddress(data.recipient)}`
                            : ''
                        successMessage = `${label} was sent ${recipient}`
                    }

                    generateToast({
                        tx,
                        pendingMessage: 'Transfer in progress...',
                        successMessage: successMessage,
                        cta: 'View Transaction',
                        onCtaClick: (updatedTx: BlockchainStoreTx) => {
                            window.open(
                                `${baseScanUrl(baseChain.id)}/tx/${
                                    updatedTx.receipt?.transactionHash
                                }`,
                                '_blank',
                                'noopener,noreferrer',
                            )
                        },
                    })
                    break
                }
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
                        errorMessage: mapToErrorMessage({ error: tx.error, source: tx.type }),
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
        errorMessage = tx.error
            ? mapToErrorMessage({ error: tx.error, source: tx.type })
            : undefined,
        cta,
        onCtaClick,
        toast,
        /**
         * if onlyShowPending is true, the toast will appear in pending state and never dismiss
         * the component that is handling other toasts must dismiss toasts at the appropriate time to remove it
         */
        onlyShowPending,
    } = props

    const [updatedTx, setUpdatedTx] = useState(tx)

    const [searchParams] = useSearchParams()
    const rolesParam = searchParams.get('roles')

    const { message } = useMemo(() => {
        return updatedTx.status === 'pending' || updatedTx.status === 'potential'
            ? {
                  message: pendingMessage,
              }
            : updatedTx.status === 'success'
            ? {
                  message: successMessage,
              }
            : {
                  message: errorMessage,
              }
    }, [updatedTx.status, pendingMessage, successMessage, errorMessage])

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useOnTransactionUpdated(
        (_tx) => {
            if (_tx.id !== tx.id) {
                return
            }

            if (onlyShowPending && (_tx.status === 'failure' || _tx.status === 'success')) {
                return
            }

            setUpdatedTx(_tx)

            const dismissTimer = () => {
                timeoutRef.current && clearTimeout(timeoutRef.current)
                timeoutRef.current = setTimeout(() => {
                    headlessToast.dismiss(toast.id)
                }, 8_000)
            }

            if (_tx.status === 'failure') {
                const errorMessage = mapToErrorMessage({ error: _tx.error, source: _tx.type })
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

    const { closePanel } = usePanelActions()

    const onSuccess = useCallback(() => {
        switch (tx.type) {
            case BlockchainTransactionType.CreateRole:
            case BlockchainTransactionType.DeleteRole:
            case BlockchainTransactionType.UpdateRole:
                // navigate back to past panel (role list / channel creation)
                if (rolesParam) {
                    closePanel()
                }
                break

            default:
                break
        }
    }, [closePanel, rolesParam, tx.type])

    // prevent flash when user rejects tx
    if (updatedTx.status === 'failure' && !errorMessage) {
        return null
    }

    if (updatedTx.status === 'success') {
        return (
            <StandardToast.Success
                toast={toast}
                message={message ?? ''}
                cta={cta}
                onCtaClick={() => onCtaClick?.(updatedTx)}
            />
        )
    }

    if (updatedTx.status === 'failure') {
        return (
            <StandardToast.Error
                toast={toast}
                message={message ?? ''}
                cta={cta}
                onCtaClick={() => onCtaClick?.(updatedTx)}
            />
        )
    }

    return <StandardToast.Pending toast={toast} message={message ?? ''} />
}
