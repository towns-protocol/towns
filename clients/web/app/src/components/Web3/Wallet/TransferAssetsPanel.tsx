import React, { useCallback, useMemo } from 'react'
import { FormProvider, useFormContext } from 'react-hook-form'
import { useGetEmbeddedSigner } from '@towns/privy'
import {
    BlockchainTransactionType,
    TransferAssetTransactionContext,
    useIsTransactionPending,
    useLinkedWallets,
    useTransferAssetTransaction,
} from 'use-towns-client'
import { ethers } from 'ethers'
import { ErrorMessage, FancyButton, FormRender, Stack, Text, TextField } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { formatUnits, parseUnits, useBalance } from 'hooks/useBalance'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import {
    getCollectionsForAddressQueryData,
    invalidateCollectionsForAddressQueryData,
} from 'api/lib/tokenContracts'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useGetWalletParam, useIsAAWallet } from './useGetWalletParam'
import { TransferSchema, transferSchema } from './transferAssetsSchema'
import { WalletSelector } from './WalletSelector'
import { AssetSelector, ETH_OPTION } from './AssetSelector'
import { useEthInputChange } from '../EditMembership/useEthInputChange'
import { UserOpTxModal } from '../UserOpTxModal/UserOpTxModal'
import { FullPanelOverlay } from '../WalletLinkingPanel'
import { useBaseNftsForTransfer } from './useBaseNftsForTransfer'

export const TransferAssetsPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <TransferAssets />
        </PrivyWrapper>
    )
})

function TransferAssets() {
    const isAAWallet = useIsAAWallet()
    const fromWallet = useGetWalletParam()
    const isPendingTransferAsset = useIsTransactionPending(BlockchainTransactionType.TransferAsset)
    const { nfts, isFetching } = useBaseNftsForTransfer(fromWallet)
    const { data: linkedWallets, isLoading: isLinkedWalletsLoading } = useLinkedWallets()

    const { data: aaWalletBalance } = useBalance({
        address: fromWallet,
        enabled: isAAWallet,
        watch: true,
    })

    if (!isAAWallet || !fromWallet) {
        return <></>
    }

    if (isFetching || isLinkedWalletsLoading) {
        return <ButtonSpinner />
    }

    return (
        <Panel label="Transfer Asset" padding="none" data-testid="transfer-assets-panel">
            <Stack height="100%">
                <FormRender
                    schema={transferSchema}
                    id="TransferAssets"
                    mode="onChange"
                    height="100%"
                >
                    {(form) => {
                        const isSubmitting = form.formState.isSubmitting
                        return (
                            <FormProvider {...form}>
                                <Stack padding gap grow overflow="auto">
                                    <Stack gap position="relative" zIndex="above">
                                        <Text strong>Asset</Text>
                                        <AssetSelector
                                            nfts={nfts}
                                            fromWallet={fromWallet}
                                            aaWalletBalance={aaWalletBalance}
                                        />
                                        <EthInputField aaWalletBalance={aaWalletBalance} />
                                    </Stack>
                                    <Stack gap>
                                        <Text strong>Send to</Text>
                                        <WalletSelector
                                            linkedWallets={linkedWallets}
                                            fromWallet={fromWallet}
                                        />
                                    </Stack>
                                </Stack>
                                <SubmitButton fromWallet={fromWallet} />
                                {(isPendingTransferAsset || isSubmitting) && (
                                    <FullPanelOverlay withSpinner={false} />
                                )}
                            </FormProvider>
                        )
                    }}
                </FormRender>
                <UserOpTxModal requiresBalanceGreaterThanCost={false} />
            </Stack>
        </Panel>
    )
}

function EthInputField(props: { aaWalletBalance: ReturnType<typeof useBalance>['data'] }) {
    const { register, formState, watch, setValue, trigger, setError } =
        useFormContext<TransferSchema>()
    const assetToTransfer = watch('assetToTransfer')
    const ethAmount = watch('ethAmount')
    const onCostChange = useEthInputChange(ethAmount ?? '', 'ethAmount', setValue, trigger)
    const _balance = props.aaWalletBalance?.value

    const onChangeWithValueGuard = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target
            if (_balance) {
                const isNumber = /^-?\d+(\.\d+)?$/.test(value)

                if (isNumber && parseUnits(value) > _balance) {
                    setError('ethAmount', {
                        message: 'Insufficient balance',
                    })
                    return
                }
            }

            onCostChange(e)
        },
        [onCostChange, _balance, setError],
    )

    const onMaxClick = () => {
        if (props.aaWalletBalance) {
            // no rounding the value
            setValue('ethAmount', formatUnits(props.aaWalletBalance.value), {
                shouldValidate: true,
            })
        }
    }

    if (assetToTransfer !== 'BASE_ETH') {
        return null
    }

    return (
        <>
            <TextField
                autoFocus
                data-testid="eth-amount"
                background="level2"
                placeholder="Enter amount"
                renderLabel={(label) => (
                    <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                        <Text strong>{label}</Text>
                        <Stack cursor="pointer" data-testid="max-button" onClick={onMaxClick}>
                            <Text size="sm" color="cta2">
                                Enter Max
                            </Text>
                        </Stack>
                    </Stack>
                )}
                label="Amount"
                tone={formState.errors.ethAmount ? 'error' : 'neutral'}
                {...register('ethAmount')}
                onChange={onChangeWithValueGuard}
            />
            {formState.errors.ethAmount ? (
                <ErrorMessage errors={formState.errors} fieldName="ethAmount" />
            ) : (
                <Text size="sm">&nbsp;</Text>
            )}
        </>
    )
}

function SubmitButton(props: { fromWallet: string }) {
    const { fromWallet } = props
    const { handleSubmit, formState, watch, setError, reset } = useFormContext<TransferSchema>()
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const allValues = watch()
    const { assetToTransfer, ethAmount, recipient } = allValues
    const { transferAsset } = useTransferAssetTransaction()

    const isDisabled = useMemo(() => {
        if (formState.isSubmitting) {
            return true
        }
        if (!assetToTransfer) {
            return true
        }
        if (assetToTransfer === 'BASE_ETH' && (formState.errors.ethAmount || !ethAmount)) {
            return true
        }
        if (!recipient) {
            return true
        }
        return false
    }, [assetToTransfer, ethAmount, recipient, formState.errors.ethAmount, formState.isSubmitting])

    const onValid = useCallback(
        async (data: TransferSchema) => {
            if (!isPrivyReady) {
                return
            }

            const signer = await getSigner()

            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            if (!data.assetToTransfer) {
                return
            }

            if (data.assetToTransfer === 'BASE_ETH' && (!data.ethAmount || data.tokenId)) {
                return
            }

            if (data.assetToTransfer !== 'BASE_ETH' && (!data.tokenId || data.ethAmount)) {
                return
            }

            if (!data.recipient) {
                return
            }

            let valueInWei: ethers.BigNumberish | undefined
            if (data.assetToTransfer === 'BASE_ETH') {
                try {
                    valueInWei = ethers.utils.parseEther(data.ethAmount ?? '')
                } catch (error) {
                    setError('ethAmount', {
                        type: 'manual',
                        message: 'Please enter a valid eth value.',
                    })
                }
            }

            const tokenMetadata = getCollectionsForAddressQueryData(fromWallet)?.find(
                (t) => t.data.address === assetToTransfer,
            )

            const dataToSubmit: TransferAssetTransactionContext['data'] =
                data.assetToTransfer === 'BASE_ETH'
                    ? {
                          contractAddress: ETH_OPTION.data.address,
                          value: valueInWei,
                          assetLabel: 'Base ETH',
                          recipient: data.recipient,
                          tokenId: '',
                      }
                    : {
                          contractAddress: data.assetToTransfer,
                          tokenId: data.tokenId ?? '',
                          assetLabel: tokenMetadata?.data.label ?? data.assetToTransfer,
                          recipient: data.recipient,
                          value: undefined,
                      }

            const context = await transferAsset(dataToSubmit, signer)
            if (context?.receipt?.status === 1) {
                await invalidateCollectionsForAddressQueryData(fromWallet)
                reset()
            }
        },
        [isPrivyReady, getSigner, fromWallet, transferAsset, reset, setError, assetToTransfer],
    )

    return (
        <Stack padding>
            <FancyButton
                cta={!isDisabled}
                data-testid="submit-button"
                disabled={isDisabled}
                onClick={handleSubmit(onValid)}
            >
                Send
            </FancyButton>
        </Stack>
    )
}
