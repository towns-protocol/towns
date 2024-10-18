import React, { useCallback, useEffect, useMemo } from 'react'
import { FormProvider, useFormContext } from 'react-hook-form'
import { useGetEmbeddedSigner } from '@towns/privy'
import {
    Address,
    BlockchainTransactionType,
    SpaceAddressFromSpaceId,
    useConnectivity,
    useIsTransactionPending,
    useLinkedWallets,
    useTransferAssetTransaction,
} from 'use-towns-client'
import { ErrorMessage, FancyButton, FormRender, Stack, Text, TextField } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { formatUnits, parseUnits, useBalance } from 'hooks/useBalance'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { invalidateCollectionsForAddressQueryData } from 'api/lib/tokenContracts'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useGetAssetSourceParam, useIsAAWallet } from './useGetWalletParam'
import { TransferSchema, transferSchema } from './transferAssetsSchema'
import { WalletSelector } from './WalletSelector'
import { AssetSelector, EthDetail } from './AssetSelector'
import { useEthInputChange } from '../EditMembership/useEthInputChange'
import { UserOpTxModal } from '../UserOpTxModal/UserOpTxModal'
import { FullPanelOverlay } from '../WalletLinkingPanel'
import { useBaseNftsForTransfer } from './useBaseNftsForTransfer'
import {
    getEthTransferData,
    getNftTransferData,
    getTreasuryTransferData,
} from './transferAssetsData'

export const TransferAssetsPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <TransferAssets />
        </PrivyWrapper>
    )
})

function TransferAssets() {
    const spaceId = useSpaceIdFromPathname()
    const spaceAddress = spaceId ? (SpaceAddressFromSpaceId(spaceId) as Address) : undefined
    const assetSourceParam = useGetAssetSourceParam()
    const isAAWallet = useIsAAWallet()
    const isTreasuryTransfer = spaceAddress?.toLowerCase() === assetSourceParam?.toLowerCase()
    const source = isTreasuryTransfer ? spaceAddress : isAAWallet ? assetSourceParam : undefined
    const isPendingTransferAsset = useIsTransactionPending(BlockchainTransactionType.TransferAsset)

    const { loggedInWalletAddress } = useConnectivity()
    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { nfts, isFetching } = useBaseNftsForTransfer({
        walletAddress: source,
        enabled: !isTreasuryTransfer,
    })
    const { data: linkedWallets, isLoading: isLinkedWalletsLoading } = useLinkedWallets()
    const { data: fromBalance } = useBalance({
        address: source,
        enabled: !!source,
        watch: true,
    })
    const treasuryEmpty = isTreasuryTransfer && fromBalance?.value === 0n

    if (!source) {
        return <></>
    }

    return (
        <Panel
            label={isTreasuryTransfer ? 'Transfer Treasury' : 'Transfer Asset'}
            padding="none"
            data-testid="transfer-assets-panel"
        >
            {isFetching || isLinkedWalletsLoading ? (
                <Stack padding="md">
                    <ButtonSpinner />
                </Stack>
            ) : (
                <Stack height="100%">
                    <FormRender
                        schema={transferSchema}
                        defaultValues={
                            {
                                assetToTransfer: isTreasuryTransfer ? 'BASE_ETH' : undefined,
                            } satisfies TransferSchema
                        }
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
                                            {isTreasuryTransfer ? (
                                                <Stack padding rounded="sm" background="level2">
                                                    <EthDetail fromBalance={fromBalance} />
                                                </Stack>
                                            ) : (
                                                <>
                                                    <Text strong>Asset</Text>
                                                    <AssetSelector
                                                        nfts={nfts}
                                                        fromWallet={assetSourceParam}
                                                        fromBalance={fromBalance}
                                                    />
                                                </>
                                            )}

                                            {treasuryEmpty ? (
                                                <Stack
                                                    padding
                                                    data-testid="treasury-empty"
                                                    background="level2"
                                                    rounded="sm"
                                                >
                                                    <Text>There are no funds in the treasury.</Text>
                                                </Stack>
                                            ) : (
                                                <EthInputField
                                                    fromBalance={fromBalance}
                                                    isTreasuryTransfer={isTreasuryTransfer}
                                                />
                                            )}
                                        </Stack>
                                        {!treasuryEmpty && (
                                            <Stack gap>
                                                <Text strong>Send to</Text>
                                                <WalletSelector
                                                    aaAddress={aaAddress}
                                                    linkedWallets={linkedWallets}
                                                    fromWallet={source}
                                                />
                                            </Stack>
                                        )}
                                    </Stack>
                                    <SubmitButton
                                        isTreasuryTransfer={isTreasuryTransfer}
                                        source={source}
                                    />
                                    {(isPendingTransferAsset || isSubmitting) && (
                                        <FullPanelOverlay withSpinner={false} />
                                    )}
                                </FormProvider>
                            )
                        }}
                    </FormRender>
                    <UserOpTxModal requiresBalanceGreaterThanCost={false} />
                </Stack>
            )}
        </Panel>
    )
}

function EthInputField(props: {
    fromBalance: ReturnType<typeof useBalance>['data']
    isTreasuryTransfer: boolean
}) {
    const { fromBalance, isTreasuryTransfer } = props
    const { register, formState, watch, setValue, trigger, setError } =
        useFormContext<TransferSchema>()
    const assetToTransfer = watch('assetToTransfer')
    const ethAmount = watch('ethAmount')
    const onCostChange = useEthInputChange(ethAmount ?? '', 'ethAmount', setValue, trigger)
    const _balance = fromBalance?.value

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

            onCostChange(e.target.value)
        },
        [onCostChange, _balance, setError],
    )

    // when treasury transfer:
    // - set value to balance
    // - this is strictly for display purposes, this field is not included in the transaction
    useEffect(() => {
        if (isTreasuryTransfer && fromBalance?.value) {
            onCostChange(formatUnits(fromBalance.value))
        }
    }, [isTreasuryTransfer, fromBalance?.value, onCostChange])

    const onMaxClick = () => {
        if (isTreasuryTransfer) {
            return
        }
        if (fromBalance) {
            // no rounding the value
            onCostChange(formatUnits(fromBalance.value))
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
                disabled={isTreasuryTransfer}
                renderLabel={(label) => (
                    <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                        <Text strong>{label}</Text>
                        {!isTreasuryTransfer && (
                            <Stack cursor="pointer" data-testid="max-button" onClick={onMaxClick}>
                                <Text size="sm" color="cta2">
                                    Enter Max
                                </Text>
                            </Stack>
                        )}
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

function SubmitButton(props: { source: string | undefined; isTreasuryTransfer: boolean }) {
    const { source, isTreasuryTransfer } = props
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
            if (
                !data.assetToTransfer ||
                !data.recipient ||
                (data.assetToTransfer === 'BASE_ETH' && (!data.ethAmount || data.tokenId)) ||
                (data.assetToTransfer !== 'BASE_ETH' && (!data.tokenId || data.ethAmount))
            ) {
                return
            }

            const onParseError = () => {
                setError('ethAmount', {
                    type: 'manual',
                    message: 'Please enter a valid eth value.',
                })
            }

            const isNftTransfer = data.assetToTransfer !== 'BASE_ETH'
            const dataToSubmit = isTreasuryTransfer
                ? getTreasuryTransferData({ data, spaceAddress: source })
                : isNftTransfer
                ? getNftTransferData({ data, fromWallet: source })
                : getEthTransferData({ data, onParseError })

            if (!dataToSubmit) {
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error with your submission."
                    />
                ))
                return
            }

            const context = await transferAsset(dataToSubmit, signer)
            if (isNftTransfer && source && context?.receipt?.status === 1) {
                await invalidateCollectionsForAddressQueryData(source)
                reset()
            }
        },
        [isPrivyReady, getSigner, isTreasuryTransfer, source, transferAsset, setError, reset],
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
