import { UseFormReturn } from 'react-hook-form'
import { MembershipStruct, NoopRuleData, Permission, createOperationsTree } from '@river-build/web3'
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
import { useImageStore } from '@components/UploadImage/useImageStore'
import { useUploadImage } from 'api/lib/uploadImage'
import { FailedUploadAfterSpaceCreation } from '@components/Notifications/FailedUploadAfterSpaceCreation'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
import { useStore } from 'store/store'
import { useAnalytics } from 'hooks/useAnalytics'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
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
    const { data, isLoading, error, createSpaceTransactionWithRole } = useCreateSpaceTransaction()

    const navigate = useNavigate()
    const { analytics } = useAnalytics()
    const spaceInfoCache = useMutationSpaceInfoCache()

    const hasError = useMemo(() => {
        return Boolean(error && error.name !== 'ACTION_REJECTED')
    }, [error])

    useEffect(() => {
        if (hasError) {
            datadogRum.addError(new Error(`Error creating town: ${error?.name} ${error?.message}`))
        }
    }, [error, hasError])

    const { mutate: uploadImage } = useUploadImage(undefined, {
        onError: () => {
            if (data?.spaceId === undefined) {
                console.warn('No space id, cannot upload space image')
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId ?? ''}
                        message="There was an error uploading your town image."
                    />
                ),
                {
                    duration: 10_000,
                },
            )
        },
    })

    const onSubmit = useCallback(async () => {
        toast.dismiss()
        setRecentlyMintedSpaceToken(undefined)

        setTransactionDetails({
            isTransacting: true,
            townAddress: undefined,
        })

        form.handleSubmit(
            async (values) => {
                const { spaceName, membershipCost, membershipLimit, tokensGatingMembership } =
                    values

                const createSpaceInfo: CreateSpaceInfo = {
                    name: spaceName ?? '',
                    shortDescription: values.shortDescription ?? '',
                    longDescription: values.longDescription ?? '',
                    // TODO: spaceMetadata
                    // TODO: defaultChannelName?
                }

                analytics?.track('submitting create town form', {}, () => {
                    console.log('[analytics] submitting create town form')
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
                    priceInWei = ethers.utils.parseEther(membershipCost)
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
                //////////////////////////////////////////
                // check quantity
                //////////////////////////////////////////
                if (tokensGatingMembership.length > 0) {
                    const missingQuantity = tokensGatingMembership.some(
                        (token) => token.quantity === 0 || token.quantity === undefined,
                    )
                    if (missingQuantity) {
                        form.setError('tokensGatingMembership', {
                            type: 'manual',
                            message: 'Please enter a valid quantity.',
                        })
                        setPanelType(PanelType.all)

                        setTransactionDetails({
                            isTransacting: false,
                            townAddress: undefined,
                        })
                        return
                    }
                }
                //////////////////////////////////////////
                // check rule data
                //////////////////////////////////////////
                const isEveryone = tokensGatingMembership.length === 0
                const ruleData = isEveryone
                    ? NoopRuleData
                    : createOperationsTree(
                          tokensGatingMembership.map((t) => ({
                              address: t.address as Address,
                              chainId: BigInt(t.chainId),
                              type: convertTokenTypeToOperationType(t.type),
                              threshold: BigInt(t.quantity),
                          })),
                      )

                //////////////////////////////////////////
                // create space
                //////////////////////////////////////////
                const requirements: MembershipStruct = {
                    settings: {
                        name: createSpaceInfo.name + ' - Member',
                        symbol: 'MEMBER',
                        price: priceInWei,
                        maxSupply: membershipLimit,
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
                        // TODO: make sure token gating works after xchain updated
                        everyone: isEveryone,
                        users: [],
                        ruleData,
                    },
                    permissions: [Permission.Read, Permission.Write],
                }
                console.log('submitting values: ', {
                    createSpaceInfo,
                    requirements,
                })

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
                        analytics?.track(
                            'error creating town',
                            {
                                error: errorMessage,
                            },
                            () => {
                                console.log('[analytics] error creating town:', errorMessage)
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
                    const tracked = {
                        spaceName: createSpaceInfo.name,
                        spaceId: result.data.spaceId,
                        everyone: isEveryone,
                        pricingModule: isFixedPricing ? 'fixed' : 'dynamic',
                        priceInWei: priceInWei.toString(),
                        tokensGatingMembership: tokensGatingMembership.map((t) => ({
                            address: t.address,
                            chainId: t.chainId,
                            tokenType: t.type,
                            quantity: t.quantity,
                        })),
                    }
                    analytics?.track('created town', tracked, () => {
                        console.log('[analytics] created town', tracked)
                    })

                    if (values.spaceIconUrl && values.spaceIconFile) {
                        const { setLoadedResource } = useImageStore.getState()
                        const { spaceIconUrl, spaceIconFile } = values
                        // set the image before upload so that it displays immediately
                        setLoadedResource(networkId, {
                            imageUrl: values.spaceIconUrl,
                        })

                        uploadImage({
                            id: networkId,
                            file: spaceIconFile,
                            imageUrl: spaceIconUrl,
                            type: 'spaceIcon',
                        })
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
                        console.log('error getting space info after creating town: ', error)
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
                setPanelType(PanelType.all)
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
        analytics,
        getSigner,
        spaceDapp,
        membershipPricingType,
        minimumMmebershipPrice,
        setPanelType,
        createSpaceTransactionWithRole,
        onCreateSpaceFlowStatus,
        addChannelNotificationSettings,
        uploadImage,
        spaceInfoCache,
        navigate,
    ])

    return children({
        onSubmit,
        disabled:
            !isPrivyReady ||
            isLoading ||
            !form.formState.isDirty ||
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
