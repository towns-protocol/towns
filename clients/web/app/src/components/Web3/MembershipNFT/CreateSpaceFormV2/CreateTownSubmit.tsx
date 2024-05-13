import { UseFormReturn } from 'react-hook-form'
import { MembershipStruct, NoopRuleData, Permission, createOperationsTree } from '@river-build/web3'
import {
    Address,
    CreateSpaceInfo,
    findDynamicPricingModule,
    findFixedPricingModule,
    useCreateSpaceTransaction,
    useTownsClient,
} from 'use-towns-client'
import { useNavigate } from 'react-router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { datadogRum } from '@datadog/browser-rum'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, Icon, IconButton, Text } from '@ui'
import { PATHS } from 'routes'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { useUploadImage } from 'api/lib/uploadImage'
import { useSetSpaceIdentity } from 'hooks/useSpaceIdentity'
import { FailedUploadAfterSpaceCreation } from '@components/Notifications/FailedUploadAfterSpaceCreation'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
import { useStore } from 'store/store'
import { PanelType, TransactionDetails } from './types'
import {
    CreateSpaceFormV2SchemaType,
    MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH,
} from './CreateSpaceFormV2.schema'
import { mapToErrorMessage } from '../../utils'

export function CreateTownSubmit({
    form,
    setPanelType,
    setTransactionDetails,
    children,
}: {
    form: UseFormReturn<CreateSpaceFormV2SchemaType>
    setPanelType: (panelType: PanelType | undefined) => void
    setTransactionDetails: ({ isTransacting }: TransactionDetails) => void
    children: (props: { onSubmit: () => void; disabled: boolean }) => React.ReactNode
}) {
    const getSigner = useGetEmbeddedSigner()
    const { spaceDapp } = useTownsClient()
    const { setRecentlyMintedSpaceToken } = useStore()
    const [membershipCostValue, membershipPricingType] = form.watch([
        'membershipCost',
        'membershipPricingType',
    ])

    // use the hook props instead of BlockchainStore/BlockchainTxNotifier
    // b/c creating a space does a lot of things on river and we want to wait for those too, not just for the tx
    const { data, isLoading, error, createSpaceTransactionWithRole } = useCreateSpaceTransaction()

    const navigate = useNavigate()

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
    const { mutate: uploadSpaceIdentity } = useSetSpaceIdentity(undefined, {
        onError: () => {
            if (data?.spaceId === undefined) {
                console.warn('No space id, cannot upload space bio')
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId ?? ''}
                        message="There was an error uploading your town bio."
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
                    // TODO: spaceMetadata
                    // TODO: defaultChannelName?
                }

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

                if (!dynamicPricingModule || !fixedPricingModule) {
                    console.warn('Cannot find dynamic pricing or fixed pricing modules')
                    setPricingModuleError()
                    return
                }
                const isFixedPricing = membershipPricingType === 'fixed'

                if (
                    isFixedPricing &&
                    priceInWei.lt(
                        ethers.utils.parseEther(MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH.toString()),
                    )
                ) {
                    form.setError('membershipPricingType', {
                        type: 'manual',
                        message: `Fixed price must be at least ${MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH} ETH`,
                    })
                    setPanelType(PanelType.all)
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    return
                }

                let pricingModuleToSubmit: string
                if (isFixedPricing) {
                    pricingModuleToSubmit = await fixedPricingModule.module
                } else {
                    pricingModuleToSubmit = await dynamicPricingModule.module
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
                        feeRecipient: await signer.getAddress(),
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
                )

                if (result?.error) {
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    const errorMessage = result?.error && mapToErrorMessage(result.error)

                    if (errorMessage) {
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

                    // if there's no bio, just upload an empty string
                    const { spaceMotto, spaceBio } = values
                    uploadSpaceIdentity({
                        spaceIdentity: { motto: spaceMotto ?? '', bio: spaceBio ?? '' },
                        innerSpaceId: networkId,
                    })

                    let timeoutDuration = 0
                    try {
                        const spaceInfo = await spaceDapp?.getSpaceInfo(networkId)
                        setTransactionDetails({
                            isTransacting: true,
                            townAddress: spaceInfo?.address as Address,
                        })
                        timeoutDuration = 3000
                    } catch (error) {
                        console.log('error getting space info after creating town: ', error)
                    }

                    setRecentlyMintedSpaceToken({ spaceId: networkId, isOwner: true })

                    setTimeout(() => {
                        navigate(newPath)
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
        setTransactionDetails,
        form,
        getSigner,
        spaceDapp,
        uploadImage,
        uploadSpaceIdentity,
        membershipPricingType,
        setPanelType,
        createSpaceTransactionWithRole,
        setRecentlyMintedSpaceToken,
        navigate,
    ])

    return children({
        onSubmit,
        disabled:
            isLoading ||
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
