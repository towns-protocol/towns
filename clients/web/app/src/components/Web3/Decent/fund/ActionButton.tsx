import { useAccount, useSwitchChain } from 'wagmi'
import { useSetActiveWallet } from '@privy-io/wagmi'
import React, { useEffect, useMemo, useState } from 'react'
import { Toast } from 'react-hot-toast'
import { ConnectAndSetActive } from '@components/Web3/Decent/ConnectAndSetActive'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Button, ButtonProps, Icon, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import {
    useActiveWalletIsPrivy,
    useIsWagmiConnected,
} from '@components/Web3/Decent/useActiveWalletIsPrivy'
import { useNonPrivyWallets } from '@components/Web3/Decent/SelectDifferentWallet'
import { isBoxActionResponseError } from '@components/Web3/Decent/utils'
import { ConnectedWalletIcon } from '@components/Web3/Decent/ConnectedWalletIcon'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { popupToast } from '@components/Notifications/popupToast'
import { useFundContext, useFundTxStore } from './FundContext'
import { sendSwapTransaction } from '../useSwapAction'
import { waitForReceipt } from '../waitForReceipt'
import { FundWalletCallbacks } from './types'
import { approveToken } from '../checkForApproval'

const INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'
const INVALID_SWAP = 'INVALID_SWAP'

export function ActionButton(props: FundWalletCallbacks) {
    const isWagmiConnected = useIsWagmiConnected()
    const nonPrivyWallets = useNonPrivyWallets()
    const { setActiveWallet } = useSetActiveWallet()
    const activeWalletIsPrivy = useActiveWalletIsPrivy()

    const buttonStates = useButtonStates(props)
    const showConnectWallet = nonPrivyWallets.length === 0 || !isWagmiConnected
    const showSetActiveWallet = nonPrivyWallets.length && activeWalletIsPrivy

    if (buttonStates.status === INSUFFICIENT_FUNDS || buttonStates.status === INVALID_SWAP) {
        return (
            <Stack
                horizontal
                centerContent
                height="x6"
                gap="sm"
                rounded="full"
                background="negativeSubtle"
            >
                <Icon type="alert" size="square_sm" />
                <Text>
                    {buttonStates.status === INSUFFICIENT_FUNDS
                        ? 'Insufficient funds'
                        : buttonStates.status === INVALID_SWAP
                        ? 'Invalid Swap'
                        : 'There was an error'}
                </Text>
            </Stack>
        )
    }

    // we're hiding/showing here instead of removing from DOM b/c of usePrivyConnectWallet, the onSuccess callback doesn't fire if the ConnectAndSetActive component is unmounted
    return (
        <>
            {/* select a different wallet */}
            <Stack
                gap
                display={showSetActiveWallet && !showConnectWallet ? 'flex' : 'none'}
                paddingTop="md"
                alignItems="center"
            >
                <Text>Select the wallet you want to fund your account</Text>
                {nonPrivyWallets.map((w) => (
                    <Button
                        width="100%"
                        rounded="full"
                        key={w.address}
                        onClick={() => setActiveWallet(w)}
                    >
                        <ConnectedWalletIcon walletName={w.walletClientType} />
                        {shortAddress(w.address)}
                    </Button>
                ))}
            </Stack>
            {/* connect a new wallet */}
            <Stack display={showConnectWallet && !showSetActiveWallet ? 'flex' : 'none'}>
                <ConnectAndSetActive onConnectWallet={props.onConnectWallet} />
            </Stack>
            {/* fund the account */}
            <Stack display={!showConnectWallet && !showSetActiveWallet ? 'flex' : 'none'}>
                <Button
                    rounded="full"
                    disabled={buttonStates.disabled}
                    tone={buttonStates.tone ?? 'cta1'}
                    onClick={buttonStates.onClick}
                >
                    {(buttonStates.loading || buttonStates.isApproving) && <ButtonSpinner />}
                    <Text>{buttonStates.text}</Text>
                </Button>
            </Stack>
        </>
    )
}

function useButtonStates(props: FundWalletCallbacks) {
    const { onTxStart, onTxSuccess, onTxError } = props
    const { chainId: walletChainId } = useAccount()
    const { switchChain } = useSwitchChain()
    const [isApproving, setIsApproving] = useState(false)
    const {
        estimatedGasFailureReason,
        amount,
        srcToken,
        estimatedGas,
        isEstimatedGasLoading,
        boxActionResponse,
        isBoxActionLoading,
        disabled,
        isApprovalRequired,
        setTx,
        setApprovedAt,
    } = useFundContext()
    const srcChainId = srcToken?.chainId
    const chainMismatch = srcChainId !== walletChainId

    const buttonStates: {
        text?: string
        onClick?: () => void
        tone?: ButtonProps['tone']
        loading?: boolean
        disabled?: boolean
        status?: typeof INSUFFICIENT_FUNDS | typeof INVALID_SWAP
        isApproving?: boolean
    } = useMemo(() => {
        if (chainMismatch && srcChainId) {
            return {
                text: 'Switch Network',
                onClick: () => switchChain({ chainId: srcChainId }),
            }
        }

        if (isApprovalRequired) {
            return {
                text: isApproving ? 'Approving...' : 'Approve Transaction',
                disabled: disabled || isApproving,
                isApproving,
                onClick: async () => {
                    if (disabled || isApproving) {
                        return
                    }
                    setIsApproving(true)
                    if (
                        !boxActionResponse ||
                        !boxActionResponse.tokenPayment ||
                        !srcToken?.address
                    ) {
                        return
                    }
                    const receipt = await approveToken(
                        {
                            token: srcToken?.address,
                            spender: boxActionResponse.tx.to,
                            amount: boxActionResponse.tokenPayment.amount,
                        },
                        srcToken?.chainId,
                    )

                    const failureToast = () =>
                        popupToast(({ toast }) => (
                            <StandardToast.Error message="Token approval failed" toast={toast} />
                        ))

                    if (receipt) {
                        if (receipt?.status === 'success') {
                            popupToast(({ toast }) => (
                                <StandardToast.Success
                                    message="Token approved for funding"
                                    toast={toast}
                                />
                            ))
                        } else {
                            failureToast()
                        }
                    } else {
                        failureToast()
                    }
                    setIsApproving(false)
                    // tick the time so useSwapWithApproval can re-check
                    setApprovedAt(new Date())
                },
            }
        }

        // disable button if gas estimate fails - the tx would fail
        if (estimatedGasFailureReason) {
            if (
                (estimatedGasFailureReason.cause as { name: string }).name ===
                'InsufficientFundsError'
            ) {
                return {
                    status: INSUFFICIENT_FUNDS,
                }
            } else {
                return {
                    text: 'Fund',
                    disabled: true,
                }
            }
        }

        // the box response returned but decent can't find a way to make the swap
        // the error messages are things like "no available routes with liquidity"
        // for now just catch all and show the same error message
        if (isBoxActionResponseError(boxActionResponse)) {
            return {
                status: INVALID_SWAP,
            }
        }

        if (!amount) {
            return {
                text: 'Fund',
                disabled: true,
            }
        }

        if (!estimatedGas || !boxActionResponse || isEstimatedGasLoading || isBoxActionLoading) {
            return {
                text: '',
                loading: true,
                disabled: true,
            }
        }

        return {
            text: 'Fund',
            disabled,
            onClick: async () => {
                if (disabled) {
                    return
                }
                setTx({
                    status: 'pending',
                })
                // popupToast(FundToast, {
                //     duration: Infinity,
                // })
                onTxStart?.({
                    sourceChain: srcToken?.chainId,
                    sourceAsset: srcToken?.address,
                    sourceAmount: amount.toString(),
                })

                try {
                    const hash = await sendSwapTransaction({
                        srcChainId: srcToken?.chainId,
                        tx: boxActionResponse?.tx,
                    })

                    if (hash) {
                        try {
                            const receipt = await waitForReceipt({ hash })
                            if (receipt?.status === 'success') {
                                setTx({
                                    status: 'success',
                                    receipt: receipt,
                                })
                                await onTxSuccess?.(receipt)
                            } else {
                                setTx({
                                    status: 'error',
                                    error: new Error('Failed to get receipt'),
                                })
                                onTxError?.('Failed to get receipt')
                            }
                        } catch (error) {
                            console.error('[useButtonStates waitForReceipt] error', error)
                            onTxError?.(error)
                            setTx({
                                status: 'error',
                                error: error as Error,
                            })
                        }
                    }
                } catch (error) {
                    onTxError?.(error)
                    setTx({
                        status: 'error',
                        error: error as Error,
                    })
                }
            },
        }
    }, [
        chainMismatch,
        srcChainId,
        isApprovalRequired,
        estimatedGasFailureReason,
        boxActionResponse,
        amount,
        estimatedGas,
        isEstimatedGasLoading,
        isBoxActionLoading,
        disabled,
        switchChain,
        isApproving,
        srcToken?.address,
        srcToken?.chainId,
        setApprovedAt,
        setTx,
        onTxStart,
        onTxSuccess,
        onTxError,
    ])

    return buttonStates
}

// In case we need to change pending state from overlay spinner to toast
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FundToast(props: { toast: Toast }) {
    const { toast } = props
    const tx = useFundTxStore((s) => s)

    useEffect(() => {
        let timeout: NodeJS.Timeout | null = null
        if (tx?.status === 'success' || tx?.status === 'error') {
            timeout = setTimeout(() => {
                dismissToast(toast.id)
            }, 8_000)
        }
        return () => {
            timeout && clearTimeout(timeout)
        }
    }, [toast.id, tx?.status])

    if (!tx?.status) {
        return null
    }

    if (tx.status === 'pending') {
        return <StandardToast.Pending toast={toast} message="Swapping funds" />
    }

    if (tx.status === 'success') {
        return <StandardToast.Success toast={toast} message="Funding successful" />
    }

    if (tx.status === 'error') {
        if (tx.error?.message.includes('rejected')) {
            return null
        }
        return <StandardToast.Error toast={toast} message="Funding failed" />
    }
}
