import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
    BlockchainStoreTx,
    BlockchainTransactionType,
    TipTransactionContext,
    TransferAssetTransactionContext,
    useMyMembership,
    useOnTransactionUpdated,
} from 'use-towns-client'

import headlessToast, { Toast } from 'react-hot-toast/headless'
import { useSearchParams } from 'react-router-dom'
import { BigNumber } from 'ethers'
import { isInsufficientTipBalanceException } from '@towns/userops'
import { Membership } from '@towns-protocol/sdk'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, Props as StandardToastProps } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { formatUnits } from 'hooks/useBalance'
import { shortAddress } from 'ui/utils/utils'
import { TipBurst } from '@components/MessageLayout/tips/TipBurst'
import { useStore } from 'store/store'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { ACTION_REJECTED, baseScanUrl, mapToErrorMessage } from './utils'
import { ERROR_MEMBERSHIP_INSUFFICIENT_PAYMENT } from './constants'
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
    return (
        <ErrorBoundary fallbackRender={() => null}>
            <InnerBlockchainTxNotifier />
        </ErrorBoundary>
    )
}

function InnerBlockchainTxNotifier() {
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
                        errorMessage: `Couldn't link wallet.`,
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
                        errorMessage: `Couldn't unlink wallet.`,
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
                        errorMessage: `Couldn't create ${roleName} role.`,
                    })
                    break
                }
                case BlockchainTransactionType.UpdateRole: {
                    const roleName = tx.data?.roleName

                    generateToast({
                        tx,
                        pendingMessage: `Updating ${roleName} role...`,
                        successMessage: `${roleName} role updated! Any permission changes may take up to 15 minutes to reflect.`,
                        errorMessage: `Couldn't update ${roleName} role.`,
                    })
                    break
                }
                case BlockchainTransactionType.DeleteRole: {
                    generateToast({
                        tx,
                        pendingMessage: `Deleting role...`,
                        successMessage: `Role deleted!`,
                        errorMessage: `Couldn't delete role.`,
                    })
                    break
                }
                case BlockchainTransactionType.EditSpaceMembership: {
                    generateToast({
                        tx,
                        pendingMessage: 'Updating membership...',
                        successMessage: 'Membership updated!',
                        errorMessage: `Couldn't update membership.`,
                    })
                    break
                }
                case BlockchainTransactionType.PrepayMembership: {
                    generateToast({
                        tx,
                        pendingMessage: 'Adding prepaid seats...',
                        successMessage: `${tx.data?.supply} Prepaid seats added!`,
                        errorMessage: `Couldn't add prepaid seats.`,
                    })
                    break
                }
                case BlockchainTransactionType.EditChannel:
                    generateToast({
                        tx,
                        pendingMessage: 'Updating channel...',
                        successMessage: 'Channel updated!',
                        errorMessage: `Couldn't update channel.`,
                    })
                    break
                case BlockchainTransactionType.BanUser:
                    generateToast({
                        tx,
                        pendingMessage: 'Banning user...',
                        successMessage: 'User banned!',
                        errorMessage: `Couldn't ban user.`,
                    })
                    break
                case BlockchainTransactionType.UnbanUser:
                    generateToast({
                        tx,
                        pendingMessage: 'Unbanning user...',
                        successMessage: 'User unbanned!',
                        errorMessage: `Couldn't unban user.`,
                    })
                    break

                case BlockchainTransactionType.DeleteChannel:
                    generateToast({
                        tx,
                        pendingMessage: 'Disabling channel...',
                        successMessage: 'Channel disabled!',
                    })
                    break

                case BlockchainTransactionType.Tip: {
                    const data = tx.data as TipTransactionContext['data']

                    generateToast({
                        tx,
                        pendingMessage: `Sending tip to @${data?.receiverUsername}...`,
                        successMessage: `You tipped @${data?.receiverUsername}.`,
                        errorMessage: `Couldn't send tip.`,
                    })
                    break
                }

                case BlockchainTransactionType.TransferNft:
                case BlockchainTransactionType.WithdrawTreasury:
                case BlockchainTransactionType.TransferBaseEth: {
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
                    } else if (data?.contractAddress) {
                        const label = data?.assetLabel ?? data?.contractAddress
                        const recipient = data?.recipient
                            ? `to ${shortAddress(data.recipient)}`
                            : ''
                        successMessage = `${label} was sent ${recipient}`
                    } else if (data?.spaceAddress) {
                        successMessage = `Town funds were sent to ${shortAddress(data.recipient)}`
                    }

                    generateToast({
                        tx,
                        pendingMessage: 'Transfer in progress...',
                        successMessage: successMessage,
                        errorMessage: `Couldn't complete transfer.`,
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
                        errorMessage: `Couldn't create channel.`,
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
        errorMessage,
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
    const subErrorMessage = getSubErrorMessage({ error: updatedTx.error, source: updatedTx.type })
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)

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
                if (errorMessage === ACTION_REJECTED) {
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
    if (
        updatedTx.status === 'failure' &&
        (errorMessage === ACTION_REJECTED || subErrorMessage === ACTION_REJECTED)
    ) {
        return null
    }

    if (updatedTx.status === 'success') {
        if (updatedTx.type === BlockchainTransactionType.Tip) {
            return (
                <StandardToast.Success
                    success
                    toast={toast}
                    message={message ?? ''}
                    iconAnimation={<TipBurst active />}
                    icon="dollar"
                    cta={cta}
                    onCtaClick={() => onCtaClick?.(updatedTx)}
                />
            )
        }
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
        if (isInsufficientTipBalanceException(updatedTx.error)) {
            return (
                <StandardToast.Error
                    toast={toast}
                    message={`Including gas, you don't have enough ETH to tip @${updatedTx.data?.receiverUsername}`}
                    cta="Add Funds"
                    onCtaClick={() => {
                        headlessToast.dismiss(toast.id)
                        setFundWalletModalOpen(true)
                    }}
                />
            )
        }
        return (
            <StandardToast.Error
                toast={toast}
                message={message ?? ''}
                subMessage={subErrorMessage}
            />
        )
    }

    return <StandardToast.Pending toast={toast} message={message ?? ''} />
}

function getSubErrorMessage(...params: Parameters<typeof mapToErrorMessage>) {
    try {
        const [{ error, source }] = params
        const mappedError = mapToErrorMessage({ error, source })

        switch (source) {
            case BlockchainTransactionType.WithdrawTreasury:
                // special case for membership withdrawals when the space contract has an untracked balance
                // someone pays to join, space contract tracks payment, balance goes up
                // but you can also fund the space contract directly, which will also increase the balance, but those funds are not tracked
                // so we might display a balance, but you can't withdraw it
                // this is going to be solved later in contracts but for now we just show a special message
                if (mappedError?.includes?.(ERROR_MEMBERSHIP_INSUFFICIENT_PAYMENT)) {
                    return `The town contains funds that cannot be withdrawn. This can occur if
                            funds were sent directly to the town. We are woking on this!`
                }
                break
        }
        return mappedError
    } catch (error) {
        console.error(`[getSubErrorMessage] `, error)
        return typeof error === 'string' ? error : error instanceof Error ? error.message : ''
    }
}
