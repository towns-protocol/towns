import React, { useCallback, useMemo, useState } from 'react'
import {
    BlockchainStoreTx,
    BlockchainTransactionType,
    Membership,
    useMyMembership,
    useOnTransactionUpdated,
} from 'use-towns-client'

import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { useSearchParams } from 'react-router-dom'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Box, Icon, IconButton, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { mapToErrorMessage } from './utils'

type ToastProps = {
    tx: BlockchainStoreTx
    successMessage: string
    pendingMessage?: string
    pendingContextMessage?: string
    successContextMessage?: string
    errorMessage?: string
    errorContextMessage?: string
}

export function BlockchainTxNotifier() {
    const spaceId = useSpaceIdFromPathname()
    const myMembership = useMyMembership(spaceId ?? '')
    const isMember = myMembership === Membership.Join

    useOnTransactionUpdated((tx) => {
        // these potential txs will show a toast that transitions from a pending to a success or failure state
        if (tx.status === 'potential') {
            switch (tx.type) {
                case BlockchainTransactionType.LinkWallet:
                    if (!isMember) {
                        // skip b/c we can wallet link when on a public town page, and we handle there
                        return
                    }
                    generateToast({
                        tx,
                        pendingMessage: 'Linking wallet...',
                        successMessage: 'Wallet linked!',
                    })
                    break
                case BlockchainTransactionType.UnlinkWallet:
                    if (!isMember) {
                        // skip b/c we can wallet link when on a public town page, and we handle there
                        return
                    }
                    generateToast({
                        tx,
                        pendingMessage: 'Unlinking wallet...',
                        successMessage: 'Unlinked your wallet!',
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
                        successMessage: `${roleName} role updated!`,
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
    return toast.custom((t) => <MonitoringNotification {...props} toast={t} />, {
        duration: Infinity,
    })
}

function MonitoringNotification(props: ToastProps & { toast: Toast }) {
    const {
        tx,
        successMessage,
        pendingMessage = 'Transaction pending...',
        pendingContextMessage,
        successContextMessage,
        errorMessage = mapToErrorMessage(tx.error),
        errorContextMessage,
        toast,
    } = props

    const [status, setStatus] = useState(tx.status)

    const [searchParams, setSearchParams] = useSearchParams()
    const rolesParam = searchParams.get('roles')

    const isSuccess = status === 'success'
    const isPending = status === 'pending'
    const isPotential = status === 'potential'

    const { message, contextMessage } = useMemo(() => {
        return status === 'pending' || status === 'potential'
            ? {
                  message: pendingMessage,
                  contextMessage: pendingContextMessage,
              }
            : status === 'success'
            ? {
                  message: successMessage,
                  contextMessage: successContextMessage,
              }
            : {
                  message: errorMessage,
                  contextMessage: errorContextMessage,
              }
    }, [
        status,
        pendingMessage,
        pendingContextMessage,
        successMessage,
        successContextMessage,
        errorMessage,
        errorContextMessage,
    ])

    useOnTransactionUpdated((_tx) => {
        if (_tx.id !== tx.id) {
            return
        }
        setStatus(_tx.status)

        if (_tx.status === 'failure') {
            const errorMessage = mapToErrorMessage(_tx.error)
            // if the error message is empty, the user rejected the tx and we can dismiss the toast
            if (!errorMessage) {
                headlessToast.dismiss(toast.id)
                return
            }
        } else if (_tx.status === 'success') {
            onSuccess()
        }
    })

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

    return (
        <Box gap width="300" justifyContent="spaceBetween">
            <Box horizontal gap justifyContent="spaceBetween">
                <Box horizontal gap alignItems="center">
                    {isPending || isPotential ? (
                        <ButtonSpinner />
                    ) : (
                        <Icon
                            color={isSuccess ? 'positive' : 'negative'}
                            type={isSuccess ? 'check' : 'alert'}
                        />
                    )}
                    <Text as="span" display="inline">
                        {message}
                    </Text>
                </Box>

                <IconButton
                    alignSelf="center"
                    size="square_xs"
                    icon="close"
                    border="level4"
                    rounded="full"
                    disabled={isPending || isPotential}
                    visibility={isPending || isPotential ? 'hidden' : 'visible'}
                    onClick={() => headlessToast.dismiss(toast.id)}
                />
            </Box>
            {contextMessage && (
                <Box gap>
                    <Text size="sm">{contextMessage}</Text>
                </Box>
            )}
        </Box>
    )
}
