import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { invalidateCollectionsForAddressQueryData } from 'api/lib/tokenContracts'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { useGetAssetSourceParam, useIsAAWallet } from './useGetWalletParam'
import { TransferSchema, transferSchema } from './transferAssetsSchema'
import { WalletSelector } from './WalletSelector'
import { AssetSelector, EthDetail } from './AssetSelector'
import { useEthInputChange } from '../EditMembership/useEthInputChange'
import { FullPanelOverlay } from '../WalletLinkingPanel'
import { useBaseNftsForTransfer } from './useBaseNftsForTransfer'
import {
    getEthTransferData,
    getNftTransferData,
    getTreasuryTransferData,
} from './transferAssetsData'
import { TreasuryOrNftConfirmModal } from './TreasuryOrNftConfirmModal'

export const TransferAssetsPanel = React.memo(() => {
    return <TransferAssets />
})

function TransferAssets() {
    const spaceId = useSpaceIdFromPathname()
    const spaceAddress = spaceId ? (SpaceAddressFromSpaceId(spaceId) as Address) : undefined
    const assetSourceParam = useGetAssetSourceParam()
    const isAAWallet = useIsAAWallet()
    const isTreasuryTransfer = spaceAddress?.toLowerCase() === assetSourceParam?.toLowerCase()
    const source = isTreasuryTransfer ? spaceAddress : isAAWallet ? assetSourceParam : undefined
    const [searchParams] = useSearchParams()
    const defaultData = searchParams.get('data')
    let defaultAssetToTransfer
    try {
        defaultAssetToTransfer = defaultData ? JSON.parse(defaultData).assetToTransfer : undefined
    } catch (error) {
        console.error('[TransferAssetsPanel] Failed to parse default data:', error)
        defaultAssetToTransfer = undefined
    }
    const isEthTransfer = defaultAssetToTransfer === 'BASE_ETH'

    const isPendingTransferBaseEth = useIsTransactionPending(
        BlockchainTransactionType.TransferBaseEth,
    )
    const isPendingTransferNft = useIsTransactionPending(BlockchainTransactionType.TransferNft)
    const isPendingWithdrawTreasury = useIsTransactionPending(
        BlockchainTransactionType.WithdrawTreasury,
    )
    const isPendingTransferAsset =
        isPendingTransferBaseEth || isPendingTransferNft || isPendingWithdrawTreasury

    const { loggedInWalletAddress } = useConnectivity()
    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { nfts, isFetching: isFetchingNfts } = useBaseNftsForTransfer({
        walletAddress: source,
        enabled: !isTreasuryTransfer && !isEthTransfer,
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

    const getPanelTitle = () => {
        if (isTreasuryTransfer) {
            return 'Transfer Treasury'
        }
        if (isEthTransfer) {
            return 'Transfer ETH'
        }
        return 'Transfer Asset'
    }

    return (
        <Panel label={getPanelTitle()} padding="none" data-testid="transfer-assets-panel">
            {isFetchingNfts || isLinkedWalletsLoading ? (
                <Stack padding="md">
                    <ButtonSpinner />
                </Stack>
            ) : (
                <Stack padding height="100%">
                    <TransferAssetsForm
                        assetSourceParam={assetSourceParam}
                        source={source}
                        isTreasuryTransfer={isTreasuryTransfer}
                        isEthTransfer={isEthTransfer}
                        fromBalance={fromBalance}
                        nfts={nfts}
                        linkedWallets={linkedWallets}
                        isPendingTransferAsset={isPendingTransferAsset}
                        aaAddress={aaAddress}
                        treasuryEmpty={treasuryEmpty}
                    />
                </Stack>
            )}
        </Panel>
    )
}

export function TransferAssetsForm(props: {
    assetSourceParam: Address | undefined
    source: Address | undefined
    isTreasuryTransfer: boolean
    isEthTransfer: boolean
    fromBalance: ReturnType<typeof useBalance>['data']
    nfts: Token[]
    linkedWallets: string[] | undefined
    isPendingTransferAsset: boolean
    aaAddress: Address | undefined
    treasuryEmpty: boolean
}) {
    const {
        assetSourceParam,
        source,
        isTreasuryTransfer,
        isEthTransfer,
        fromBalance,
        nfts,
        linkedWallets,
        isPendingTransferAsset,
        aaAddress,
        treasuryEmpty,
    } = props
    return (
        <FormRender
            gap
            schema={transferSchema}
            defaultValues={{
                assetToTransfer: isTreasuryTransfer || isEthTransfer ? 'BASE_ETH' : undefined,
            }}
            id="TransferAssets"
            mode="onChange"
            height="100%"
        >
            {(form: UseFormReturn<TransferSchema>) => {
                const isSubmitting = form.formState.isSubmitting

                return (
                    <FormProvider {...form}>
                        {isTreasuryTransfer ? (
                            <Stack padding rounded="sm" background="level2">
                                <EthDetail fromBalance={fromBalance} />
                            </Stack>
                        ) : !isEthTransfer ? (
                            <>
                                <Text strong>Asset</Text>
                                <AssetSelector
                                    nfts={nfts}
                                    fromWallet={assetSourceParam}
                                    fromBalance={fromBalance}
                                />
                            </>
                        ) : null}

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

                        <SubmitButton isTreasuryTransfer={isTreasuryTransfer} source={source} />
                        {(isPendingTransferAsset || isSubmitting) && (
                            <FullPanelOverlay withSpinner={false} />
                        )}
                    </FormProvider>
                )
            }}
        </FormRender>
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
        <Stack gap="sm">
            <TextField
                autoFocus
                data-testid="eth-amount"
                background="level2"
                placeholder="Enter amount"
                after={<Text color="gray2">ETH</Text>}
                disabled={isTreasuryTransfer}
                renderLabel={(label) => (
                    <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                        <Text strong>{label}</Text>
                        {!isTreasuryTransfer && (
                            <Stack cursor="pointer" data-testid="max-button" onClick={onMaxClick}>
                                <Text color="cta2">Enter Max</Text>
                            </Stack>
                        )}
                    </Stack>
                )}
                label="Amount"
                tone={formState.errors.ethAmount ? 'error' : 'neutral'}
                {...register('ethAmount')}
                onChange={onChangeWithValueGuard}
            />
            <ErrorMessage preventSpace errors={formState.errors} fieldName="ethAmount" />
        </Stack>
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

            console.log('TransferAssetsPanel::onValid', dataToSubmit)

            if (!dataToSubmit) {
                return
            }

            if (isTreasuryTransfer || _isNftTransfer) {
                setShowTreasuryOrNftConfirm(true)
                return
            }

            await makeTransferTx(dataToSubmit, getSigner)
        },
        [setError, source, isTreasuryTransfer, makeTransferTx],
    )

    return (
        <WalletReady>
            {({ getSigner }) => (
                <>
                    <Stack grow />
                    <FancyButton
                        borderRadius="lg"
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

    if (dataToSubmit?.value !== undefined && dataToSubmit.value <= 0n) {
        setError('ethAmount', {
            type: 'manual',
            message: 'Please enter a positive number.',
        })
        return
    }

    if (!dataToSubmit) {
        popupToast(({ toast }) => (
            <StandardToast.Error toast={toast} message="There was an error with your submission." />
        ))
        return
    }

    return Object.freeze(dataToSubmit)
}

const isNftTransfer = (data: TransferSchema) => data.assetToTransfer !== 'BASE_ETH'
