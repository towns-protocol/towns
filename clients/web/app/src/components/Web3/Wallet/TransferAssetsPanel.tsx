import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, UseFormReturn, UseFormSetError, useFormContext } from 'react-hook-form'
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
import { GetSigner, WalletReady } from 'privy/WalletReady'
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
import { TreasuryOrNftConfirmModal } from './TreasuryOrNftConfirmModal'

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
                        {(form: UseFormReturn<TransferSchema>) => {
                            const isSubmitting = form.formState.isSubmitting
                            const recipient = form.watch('recipient')

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
                                    <UserOpTxModal
                                        toAddress={recipient}
                                        requiresBalanceGreaterThanCost={false}
                                    />
                                </FormProvider>
                            )
                        }}
                    </FormRender>
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

function SubmitButton(props: { source: Address | undefined; isTreasuryTransfer: boolean }) {
    const { source, isTreasuryTransfer } = props
    const { handleSubmit, formState, watch, setError, reset, getValues } =
        useFormContext<TransferSchema>()
    const allValues = watch()
    const { assetToTransfer, ethAmount, recipient } = allValues
    const { transferAsset } = useTransferAssetTransaction()
    const [showTreasuryOrNftConfirm, setShowTreasuryOrNftConfirm] = useState(false)

    const isDisabled = useMemo(() => {
        if (
            formState.isSubmitting ||
            !assetToTransfer ||
            (assetToTransfer === 'BASE_ETH' && (formState.errors.ethAmount || !ethAmount)) ||
            !recipient
        ) {
            return true
        }
        return false
    }, [formState.isSubmitting, formState.errors.ethAmount, assetToTransfer, ethAmount, recipient])

    const makeTransferTx = useCallback(
        async (dataToSubmit: ReturnType<typeof getValidatedData>, getSigner: GetSigner) => {
            if (!dataToSubmit) {
                return
            }
            const _isNftTransfer = isNftTransfer(dataToSubmit)
            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }

            const context = await transferAsset(dataToSubmit, signer)
            if (_isNftTransfer && source && context?.receipt?.status === 1) {
                await invalidateCollectionsForAddressQueryData(source)
                reset()
            }
        },
        [reset, source, transferAsset],
    )

    const onModalSubmit = useCallback(
        async (getSigner: GetSigner) => {
            setShowTreasuryOrNftConfirm(false)
            const validData: TransferSchema = getValues()
            const dataToSubmit = getValidatedData({
                data: validData,
                setError,
                source,
                isTreasuryTransfer,
            })
            await makeTransferTx(dataToSubmit, getSigner)
        },
        [getValues, isTreasuryTransfer, setError, source, makeTransferTx],
    )

    const onValid = useCallback(
        async (data: TransferSchema, getSigner: GetSigner) => {
            const _isNftTransfer = isNftTransfer(data)

            const dataToSubmit = getValidatedData({
                data,
                setError,
                source,
                isTreasuryTransfer,
            })

            if (!dataToSubmit) {
                return
            }

            if (isTreasuryTransfer || _isNftTransfer) {
                console.log('$$$$$$ evan.log::JJJ $$$$$$')

                setShowTreasuryOrNftConfirm(true)
                return
            }

            await makeTransferTx(dataToSubmit, getSigner)
        },
        [setError, source, isTreasuryTransfer, makeTransferTx],
    )

    return (
        <Stack padding>
            <WalletReady>
                {({ getSigner }) => (
                    <>
                        <FancyButton
                            cta={!isDisabled}
                            data-testid="submit-button"
                            disabled={isDisabled}
                            onClick={handleSubmit((data) => onValid(data, getSigner))}
                        >
                            Send
                        </FancyButton>
                        <TreasuryOrNftConfirmModal
                            data={allValues}
                            showModal={showTreasuryOrNftConfirm}
                            type={isTreasuryTransfer ? 'treasury' : 'nft'}
                            fromWallet={source}
                            onHide={() => setShowTreasuryOrNftConfirm(false)}
                            onSubmit={() => onModalSubmit(getSigner)}
                        />
                    </>
                )}
            </WalletReady>
        </Stack>
    )
}

function getValidatedData(args: {
    data: TransferSchema
    setError: UseFormSetError<TransferSchema>
    source: Address | undefined
    isTreasuryTransfer: boolean
}) {
    const { data, setError, source, isTreasuryTransfer } = args
    const _isNftTransfer = isNftTransfer(data)
    if (
        !data.assetToTransfer ||
        !data.recipient ||
        (!_isNftTransfer && (!data.ethAmount || data.tokenId)) ||
        (_isNftTransfer && (!data.tokenId || data.ethAmount))
    ) {
        return
    }

    const onParseError = () => {
        setError('ethAmount', {
            type: 'manual',
            message: 'Please enter a valid eth value.',
        })
    }

    const dataToSubmit = isTreasuryTransfer
        ? getTreasuryTransferData({ data, spaceAddress: source })
        : _isNftTransfer
        ? getNftTransferData({ data, fromWallet: source })
        : getEthTransferData({ data, onParseError })

    if (!dataToSubmit) {
        popupToast(({ toast }) => (
            <StandardToast.Error toast={toast} message="There was an error with your submission." />
        ))
        return
    }

    return dataToSubmit
}

const isNftTransfer = (data: TransferSchema) => data.assetToTransfer !== 'BASE_ETH'
