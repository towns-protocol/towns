import React, { useCallback, useState } from 'react'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { Address } from 'use-towns-client'
import { z } from 'zod'
import { useFormContext } from 'react-hook-form'
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi'
import { Hex, TransactionExecutionError } from 'viem'
import { Box, Button, ErrorMessage, FormRender, Text, TextField } from '@ui'
import { ConnectedWallet } from '@components/Web3/Decent/ConnectedWallet'
import { shortAddress } from 'ui/utils/utils'
import { parseUnits, useBalance } from 'hooks/useBalance'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { wagmiConfig } from 'wagmiConfig'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import {
    useActiveWalletIsPrivy,
    useIsWagmiConnected,
} from '@components/Web3/Decent/useActiveWalletIsPrivy'
import { useNonPrivyWallets } from '@components/Web3/Decent/SelectDifferentWallet'
import { ConnectedWalletIcon } from '@components/Web3/Decent/ConnectedWalletIcon'
import { ConnectAndSetActive } from '@components/Web3/Decent/ConnectAndSetActive'
import { useEthInputChangeWithBalanceCheck } from '@components/Web3/EditMembership/useEthInputChange'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { FundWalletCallbacks } from './fund/types'
export const tokenAmountSchema = z.object({
    tokenAmount: z.string().refine((val) => !val || /^\d*\.?\d*$/.test(val), {
        message: 'Please enter a valid number',
    }),
})

export type TokenAmountSchema = z.infer<typeof tokenAmountSchema>

type FundWalletProps = {
    requiredAmountBanner?: React.ReactNode
} & FundWalletCallbacks

export function EOAEthTransfer(props: FundWalletProps) {
    const { requiredAmountBanner, ...fundWalletCallbacks } = props
    return (
        <FormRender schema={tokenAmountSchema} id="TransferAssets" mode="onChange">
            {() => (
                <TransferEthInner
                    requiredAmountBanner={requiredAmountBanner}
                    {...fundWalletCallbacks}
                />
            )}
        </FormRender>
    )
}

function TransferEthInner(props: FundWalletProps) {
    const { requiredAmountBanner, ...fundWalletCallbacks } = props
    const { data: smartAccountAddress } = useMyAbstractAccountAddress()
    const { data: townsWalletBalance } = useBalance({
        address: smartAccountAddress,
    })
    const { address: eoaAddress } = useAccount()
    const activeWalletIsPrivy = useActiveWalletIsPrivy()

    const { data: eoaBalance } = useBalance({
        address: eoaAddress,
        enabled: !eoaAddress || !activeWalletIsPrivy,
    })
    const { register, watch, setValue, trigger, formState, setError } =
        useFormContext<TokenAmountSchema>()
    const tokenAmount = watch('tokenAmount')

    const onCostChangeWithBalanceCheck = useEthInputChangeWithBalanceCheck({
        balance: eoaBalance?.value,
        ethAmount: tokenAmount ?? '',
        path: 'tokenAmount',
        setValue,
        trigger,
        onError: () => {
            setError('tokenAmount', {
                message: 'Insufficient balance',
            })
        },
    })

    return (
        <Box gap>
            {requiredAmountBanner}
            <ConnectedWallet />
            <Box gap="sm">
                <Box gap="sm">
                    <Box gap>
                        <Text strong>Amount to transfer: </Text>
                        <Box position="relative">
                            <TextField
                                autoFocus
                                background="level3"
                                inputWidth="100%"
                                inputLimit={18}
                                placeholder="0"
                                {...register('tokenAmount')}
                                onChange={onCostChangeWithBalanceCheck}
                            />
                            <Box position="absolute" right="md" top="md">
                                <Text>ETH</Text>
                            </Box>
                        </Box>
                    </Box>
                    {formState.errors.tokenAmount ? (
                        <ErrorMessage errors={formState.errors} fieldName="tokenAmount" />
                    ) : (
                        <Text size="sm">&nbsp;</Text>
                    )}
                </Box>
                <Box gap>
                    <Text strong>To</Text>
                    <Box
                        horizontal
                        background="level3"
                        height="input_lg"
                        padding="md"
                        rounded="sm"
                        width="100%"
                        justifyContent="spaceBetween"
                    >
                        <Text>Towns Wallet</Text>
                        <Text>{townsWalletBalance?.formatted ?? 0}</Text>
                    </Box>
                </Box>
            </Box>
            {smartAccountAddress && (
                <ActionButton
                    smartAccountAddress={smartAccountAddress}
                    fundWalletCallbacks={fundWalletCallbacks}
                />
            )}
        </Box>
    )
}

function ActionButton(props: {
    smartAccountAddress: Address
    fundWalletCallbacks: FundWalletCallbacks
}) {
    const { smartAccountAddress, fundWalletCallbacks } = props
    const isWagmiConnected = useIsWagmiConnected()
    const nonPrivyWallets = useNonPrivyWallets()
    const { setActiveWallet } = useSetActiveWallet()
    const activeWalletIsPrivy = useActiveWalletIsPrivy()
    const showConnectWallet = nonPrivyWallets.length === 0 || !isWagmiConnected
    const showSetActiveWallet = nonPrivyWallets.length && activeWalletIsPrivy
    const { handleSubmit, setError, reset, formState } = useFormContext<TokenAmountSchema>()
    const { sendTransactionAsync, isPending } = useSendTransaction()
    const [isConfirming, setIsConfirming] = useState(false)
    const { switchChainAsync } = useSwitchChain()
    const { baseChain } = useEnvironment()

    // we're hiding/showing here instead of removing from DOM b/c of usePrivyConnectWallet, the onSuccess callback doesn't fire if the ConnectAndSetActive component is unmounted
    const submit = useCallback(
        async (data: TokenAmountSchema) => {
            let priceInWei: bigint
            fundWalletCallbacks.onTxStart?.({
                sourceChain: baseChain.id,
                sourceAsset: 'ETH',
                sourceAmount: data.tokenAmount,
            })

            try {
                priceInWei = parseUnits(data.tokenAmount ?? '')
            } catch (error) {
                setError('tokenAmount', {
                    type: 'manual',
                    message: 'Please enter a valid eth value.',
                })
                return
            }
            try {
                await switchChainAsync({
                    chainId: baseChain.id,
                })
            } catch (error) {
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message={`There was an error switching to ${baseChain.name}.`}
                    />
                ))
                return
            }
            let hash: Hex | undefined
            try {
                hash = await sendTransactionAsync({
                    to: smartAccountAddress,
                    value: priceInWei,
                })
            } catch (error) {
                if (
                    (error as TransactionExecutionError).cause?.message
                        ?.toLowerCase()
                        .includes('user rejected')
                ) {
                    return
                }
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error sending the transaction."
                    />
                ))
                return
            }

            reset()

            setIsConfirming(true)
            try {
                const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
                if (receipt.status === 'success') {
                    fundWalletCallbacks.onTxSuccess?.(receipt)
                } else {
                    fundWalletCallbacks.onTxError?.(receipt)
                }
            } catch (error) {
                console.error(error)
                fundWalletCallbacks.onTxError?.(error)
            } finally {
                setIsConfirming(false)
            }
        },
        [
            reset,
            setError,
            switchChainAsync,
            baseChain.id,
            baseChain.name,
            sendTransactionAsync,
            smartAccountAddress,
            fundWalletCallbacks,
        ],
    )
    return (
        <>
            {/* select a different wallet */}
            <Box
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
            </Box>
            {/* connect a new wallet */}
            <Box display={showConnectWallet && !showSetActiveWallet ? 'flex' : 'none'}>
                <ConnectAndSetActive
                    onConnectWallet={(wallet) => {
                        fundWalletCallbacks.onConnectWallet?.(wallet)
                    }}
                />
            </Box>
            {/* fund the account */}
            <Box display={!showConnectWallet && !showSetActiveWallet ? 'flex' : 'none'}>
                <Button
                    rounded="full"
                    disabled={isPending || isConfirming || !!formState.errors.tokenAmount}
                    tone="cta1"
                    onClick={handleSubmit(submit)}
                >
                    {isPending || isConfirming ? <ButtonSpinner /> : <Text>Fund account</Text>}
                </Button>
            </Box>
        </>
    )
}
