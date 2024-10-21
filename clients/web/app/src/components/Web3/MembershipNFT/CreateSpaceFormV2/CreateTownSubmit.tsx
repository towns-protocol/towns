import { UseFormReturn } from 'react-hook-form'
import { MembershipStruct, Permission, encodeRuleDataV2 } from '@river-build/web3'
import {
    Address,
    CreateSpaceInfo,
    findDynamicPricingModule,
    findFixedPricingModule,
    useCreateSpaceTransaction,
    useMutationSpaceInfoCache,
    useTownsClient,
} from 'use-towns-client'
import { useNavigate } from 'react-router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { datadogRum } from '@datadog/browser-rum'
import { useGetEmbeddedSigner } from '@towns/privy'
import { CreateSpaceFlowStatus } from 'use-towns-client/dist/client/TownsClientTypes'
import { Box, Icon, IconButton, Text } from '@ui'
import { PATHS } from 'routes'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { prepareGatedDataForSubmit } from '@components/Tokens/utils'
import { useStore } from 'store/store'
import { Analytics } from 'hooks/useAnalytics'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { useUploadAttachment } from '@components/MediaDropContext/useUploadAttachment'
import { PanelType, TransactionDetails } from './types'
import { CreateSpaceFormV2SchemaType } from './CreateSpaceFormV2.schema'
import { mapToErrorMessage } from '../../utils'

export function CreateTownSubmit({
    form,
    setPanelType,
    setTransactionDetails,
    children,
    onCreateSpaceFlowStatus,
}: {
    form: UseFormReturn<CreateSpaceFormV2SchemaType>
    setPanelType: (panelType: PanelType | undefined) => void
    setTransactionDetails: ({ isTransacting }: TransactionDetails) => void
    children: (props: { onSubmit: () => void; disabled: boolean }) => React.ReactNode
    onCreateSpaceFlowStatus?: (status: CreateSpaceFlowStatus) => void
}) {
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const { spaceDapp } = useTownsClient()
    const { setRecentlyMintedSpaceToken } = useStore()
    const [membershipCostValue, membershipPricingType] = form.watch([
        'membershipCost',
        'membershipPricingType',
    ])

    const { addChannelNotificationSettings } = useNotificationSettings()
    const { data: minimumMmebershipPrice } = usePlatformMinMembershipPriceInEth()

    // use the hook props instead of BlockchainStore/BlockchainTxNotifier
    // b/c creating a space does a lot of things on river and we want to wait for those too, not just for the tx
    const { isLoading, error, createSpaceTransactionWithRole } = useCreateSpaceTransaction()

    const navigate = useNavigate()

    const spaceInfoCache = useMutationSpaceInfoCache()

    const { uploadTownImageToStream } = useUploadAttachment()

    const hasError = useMemo(() => {
        return Boolean(error && error.name !== 'ACTION_REJECTED')
    }, [error])

    useEffect(() => {
        if (hasError) {
            datadogRum.addError(new Error(`Error creating town: ${error?.name} ${error?.message}`))
        }
    }, [error, hasError])

    const onSubmit = useCallback(async () => {
        form.handleSubmit(
            async (data: CreateSpaceFormV2SchemaType) => {
                toast.dismiss()
                setRecentlyMintedSpaceToken(undefined)

                setTransactionDetails({
                    isTransacting: true,
                    townAddress: undefined,
                })

                const prepaySupply = form.getValues().prepaidMemberships ?? 0

                const createSpaceInfo: CreateSpaceInfo = {
                    name: data.spaceName ?? '',
                    shortDescription: data.shortDescription ?? '',
                    longDescription: data.longDescription ?? '',
                    prepaySupply,
                }

                Analytics.getInstance().track('submitting create town form', {}, () => {
                    console.info('[analytics] submitting create town form')
                })

                const signer = await getSigner()
                if (!signer) {
                    createPrivyNotAuthenticatedNotification()
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    return
                }

                //////////////////////////////////////////
                // check pricing
                //////////////////////////////////////////
                let priceInWei: ethers.BigNumberish

                try {
                    priceInWei = ethers.utils.parseEther(data.membershipCost)
                } catch (error) {
                    form.setError('membershipCost', {
                        type: 'manual',
                        message: 'Please enter a valid eth value.',
                    })
                    setPanelType(PanelType.all)

                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    return
                }

                const pricingModules = await spaceDapp?.listPricingModules()
                const setPricingModuleError = () => {
                    form.setError('membershipPricingType', {
                        type: 'manual',
                        message: 'Unable to get pricing modules. Please try again later',
                    })
                    setPanelType(PanelType.all)
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                }
                if (!pricingModules) {
                    console.warn('No pricing modules found')
                    setPricingModuleError()
                    return
                }
                const dynamicPricingModule = findDynamicPricingModule(pricingModules)
                const fixedPricingModule = findFixedPricingModule(pricingModules)

                if (!dynamicPricingModule && !fixedPricingModule) {
                    console.warn('Cannot find either dynamic pricing or fixed pricing modules')
                    setPricingModuleError()
                    return
                }
                const isFixedPricing = membershipPricingType === 'fixed'

                if (
                    minimumMmebershipPrice !== undefined &&
                    isFixedPricing &&
                    priceInWei.lt(ethers.utils.parseEther(minimumMmebershipPrice))
                ) {
                    form.setError('membershipPricingType', {
                        type: 'manual',
                        message: `Fixed price must be at least ${minimumMmebershipPrice} ETH`,
                    })
                    setPanelType(PanelType.all)
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    return
                }

                let pricingModuleToSubmit: string
                if (isFixedPricing && fixedPricingModule) {
                    pricingModuleToSubmit = await fixedPricingModule.module
                } else if (dynamicPricingModule) {
                    pricingModuleToSubmit = await dynamicPricingModule.module
                } else {
                    console.warn('No pricing module found')
                    setPricingModuleError()
                    return
                }

                const { tokensGatedBy, usersGatedBy, ruleData } = prepareGatedDataForSubmit(
                    data.gatingType,
                    data.tokensGatedBy,
                    data.usersGatedBy,
                    data.ethBalanceGatedBy,
                )

                //////////////////////////////////////////
                // create space
                //////////////////////////////////////////
                const requirements: MembershipStruct = {
                    settings: {
                        name: createSpaceInfo.name + ' - Member',
                        symbol: 'MEMBER',
                        price: priceInWei,
                        maxSupply: data.membershipLimit,
                        duration: 60 * 60 * 24 * 365, // 1 year in seconds
                        currency: ethers.constants.AddressZero,
                        // this value is no longer used in contract
                        // the fees go to the space contract
                        feeRecipient: ethers.constants.AddressZero,
                        // when fixed pricing, freeAllocation is 1, meaning owner gets in for free and all future members must pay
                        // dynamic pricing has it's own set of rules in contract and has historically been set as 0 here
                        freeAllocation: isFixedPricing ? 1 : 0,
                        pricingModule: pricingModuleToSubmit,
                    },
                    requirements: {
                        everyone: data.gatingType === 'everyone',
                        users: usersGatedBy,
                        ruleData: encodeRuleDataV2(ruleData),
                        syncEntitlements: false,
                    },
                    permissions: [Permission.Read, Permission.Write, Permission.React],
                }

                // close the panel
                setPanelType(undefined)

                const result = await createSpaceTransactionWithRole(
                    createSpaceInfo,
                    requirements,
                    signer,
                    onCreateSpaceFlowStatus,
                )

                if (result?.error) {
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    const errorMessage =
                        result?.error &&
                        mapToErrorMessage({ error: result.error, source: 'create space' })

                    if (errorMessage) {
                        Analytics.getInstance().track(
                            'error creating town',
                            {
                                error: errorMessage,
                            },
                            () => {
                                console.info('[analytics] error creating town:', errorMessage)
                            },
                        )
                        toast.custom(
                            (t) => (
                                <TransactionErrorNotification
                                    toast={t}
                                    errorMessage={errorMessage}
                                />
                            ),
                            {
                                duration: Infinity,
                            },
                        )
                    }
                    return
                }

                if (result?.data && result.data.spaceId && result.data.channelId) {
                    const newPath = `/${PATHS.SPACES}/${result.data.spaceId}/${PATHS.CHANNELS}/${result.data.channelId}`
                    const networkId = result.data.spaceId
                    const trackedAnalytics = {
                        spaceName: createSpaceInfo.name,
                        spaceId: result.data.spaceId,
                        channelId: result.data.channelId,
                        channelName: createSpaceInfo.defaultChannelName ?? 'general',
                        everyone: data.gatingType === 'everyone',
                        pricingModule: isFixedPricing
                            ? 'fixed'
                            : prepaySupply > 0
                            ? 'prepaid'
                            : 'dynamic',
                        priceInWei: priceInWei.toString(),
                        tokensGatedBy: tokensGatedBy.map((t) => ({
                            address: t.data.address,
                            chainId: t.chainId,
                            tokenType: t.data.type,
                            quantity: t.data.quantity,
                            tokenId: t.data.tokenId,
                        })),
                    }
                    Analytics.getInstance().track('created town', trackedAnalytics, () => {
                        console.info('[analytics] created town', trackedAnalytics)
                    })

                    if (data.spaceIconUrl && data.spaceIconFile) {
                        await uploadTownImageToStream(networkId, data.spaceIconFile, () => {})
                    }

                    let timeoutDuration = 0
                    try {
                        const spaceInfo = await spaceDapp?.getSpaceInfo(networkId)
                        setTransactionDetails({
                            isTransacting: true,
                            townAddress: spaceInfo?.address as Address,
                        })
                        timeoutDuration = 3000
                        spaceInfoCache.mutate(spaceInfo)
                    } catch (error) {
                        console.error('error getting space info after creating town: ', error)
                    }

                    setRecentlyMintedSpaceToken({ spaceId: networkId, isOwner: true })

                    // update the notification settings for the newly created space and channel
                    await addChannelNotificationSettings({
                        channelId: result.data.channelId,
                        spaceId: result.data.spaceId,
                    })

                    setTimeout(() => {
                        navigate(newPath, {
                            state: { fromCreateTown: true },
                        })
                    }, timeoutDuration)
                }
            },
            (_errors) => {
                if (_errors.spaceIconFile || _errors.spaceName) {
                    setPanelType(undefined)
                }
                setTransactionDetails({
                    isTransacting: false,
                    townAddress: undefined,
                })
            },
        )()
    }, [
        setRecentlyMintedSpaceToken,
        setTransactionDetails,
        form,
        getSigner,
        spaceDapp,
        membershipPricingType,
        minimumMmebershipPrice,
        setPanelType,
        createSpaceTransactionWithRole,
        onCreateSpaceFlowStatus,
        addChannelNotificationSettings,
        uploadTownImageToStream,
        spaceInfoCache,
        navigate,
    ])

    return children({
        onSubmit,
        disabled:
            !isPrivyReady ||
            isLoading ||
            !form.getValues().spaceIconFile ||
            // !form.formState.isDirty ||
            Object.keys(form.formState.errors).length > 0 ||
            membershipCostValue === '' ||
            (membershipPricingType === 'fixed' && Number(membershipCostValue) === 0),
    })
}

export const TransactionErrorNotification = ({
    toast,
    errorMessage,
}: {
    toast: Toast
    errorMessage: string
}) => {
    return (
        <Box horizontal gap width="300">
            <Icon color="error" type="alert" />
            <Box gap alignItems="end">
                <Text size="sm">{errorMessage}</Text>
            </Box>
            <IconButton icon="close" onClick={() => headlessToast.dismiss(toast.id)} />
        </Box>
    )
}
