import { ethers } from 'ethers'
import React, { useCallback, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useNavigate } from 'react-router'
import {
    BASE_SEPOLIA,
    CreateSpaceInfo,
    LOCALHOST_CHAIN_ID,
    MembershipStruct,
    Permission,
    PricingModuleStruct,
    encodeRuleDataV2,
    findDynamicPricingModule,
    findFixedPricingModule,
    useCreateSpaceTransaction,
    useMutationSpaceInfoCache,
    usePlatformMintLimit,
    useTownsClient,
} from 'use-towns-client'
import type { CreateSpaceFlowStatus } from 'use-towns-client'
import { useUploadAttachment } from '@components/MediaDropContext/useUploadAttachment'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { prepareGatedDataForSubmit } from '@components/Tokens/utils'
import { mapToErrorMessage } from '@components/Web3/utils'
import { Analytics } from 'hooks/useAnalytics'
import { GetSigner } from 'privy/WalletReady'
import { PATHS } from 'routes'
import { addressFromSpaceId } from 'ui/utils/utils'
import { parseUnits } from 'hooks/useBalance'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { CreateTownFormSchema } from '../types'
type Props = {
    form: UseFormReturn<CreateTownFormSchema>
    onCreateSpaceFlowStatus?: (status: CreateSpaceFlowStatus) => void
}
export const useSubmit = (props: Props) => {
    const { form, onCreateSpaceFlowStatus } = props

    const { spaceDapp } = useTownsClient()

    const {
        isLoading: isSubmitting,
        error,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()

    const navigate = useNavigate()
    const toastIdRef = useRef<string>()
    const { uploadTownImageToStream } = useUploadAttachment()
    const spaceInfoCache = useMutationSpaceInfoCache()
    // because we submit the form with freeAllocation = 0 for dyamic pricing,
    // the contracts will use this value to calculate the free allocation
    const { data: platformMintLimit } = usePlatformMintLimit()
    const { baseChain } = useEnvironment()
    const baseChainId = baseChain.id

    const onSubmit = useCallback(
        async (getSigner: GetSigner) => {
            const submit = form.handleSubmit(
                async (data: CreateTownFormSchema) => {
                    if (toastIdRef.current) {
                        dismissToast(toastIdRef.current)
                    }

                    const createSpaceInfo: CreateSpaceInfo = {
                        name: data.slideNameAndIcon.spaceName ?? '',
                    }

                    Analytics.getInstance().track('submitting create town form', {}, () => {
                        console.info('[analytics] submitting create town form')
                    })

                    const signer = await getSigner()

                    if (!signer) {
                        createPrivyNotAuthenticatedNotification()
                        return
                    }

                    //////////////////////////////////////////
                    // check pricing
                    //////////////////////////////////////////

                    let priceInWei: bigint

                    try {
                        priceInWei = parseUnits(data.slideMembership.membershipCost ?? '')
                    } catch (error) {
                        form.setError('slideMembership.membershipCost', {
                            type: 'manual',
                            message: 'Please enter a valid eth value.',
                        })
                        return
                    }

                    let pricingModules: PricingModuleStruct[] | undefined

                    try {
                        pricingModules = await spaceDapp?.listPricingModules()
                    } catch (e) {
                        console.error(e)
                        toastIdRef.current = popupToast(
                            ({ toast }) => (
                                <StandardToast.Error
                                    message="Error validating pricing modules on-chain. Check your network connection."
                                    subMessage={mapToErrorMessage({
                                        error: e as Error,
                                        source: 'create town pricing modules',
                                    })}
                                    toast={toast}
                                />
                            ),
                            { duration: Infinity },
                        )
                        return
                    }

                    const setPricingModuleError = () => {
                        form.setError('slideMembership', {
                            type: 'manual',
                            message: 'Unable to get pricing modules. Please try again later',
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

                    const isFixedPricing =
                        data.clientTownType === 'free' ||
                        data.slideMembership.clientMembershipFee !== 'dynamic'

                    const fixedPricingModuleAddress = await fixedPricingModule?.module
                    const dynamicPricingModuleAddress = await dynamicPricingModule?.module

                    const townType = data.clientTownType

                    const { price, pricingModule, freeAllocation } = getPriceConfiguration({
                        townType,
                        isFixedPricing,
                        fixedPricingModuleAddress,
                        dynamicPricingModuleAddress,
                        platformMintLimit,
                        price: priceInWei,
                        baseChainId,
                    })

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
                            price,
                            maxSupply: data.slideMembership.membershipLimit,
                            duration: 60 * 60 * 24 * 365, // 1 year in seconds
                            currency: ethers.constants.AddressZero,
                            // this value is no longer used in contract
                            // the fees go to the space contract
                            feeRecipient: ethers.constants.AddressZero,
                            freeAllocation,
                            pricingModule,
                        },
                        requirements: {
                            everyone: data.gatingType === 'everyone',
                            users: usersGatedBy,
                            ruleData: encodeRuleDataV2(ruleData),
                            syncEntitlements: true,
                        },
                        permissions: [Permission.Read, Permission.Write, Permission.React],
                    }

                    const result = await createSpaceTransactionWithRole(
                        createSpaceInfo,
                        requirements,
                        signer,
                        onCreateSpaceFlowStatus,
                    )

                    if (result?.error) {
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
                            toastIdRef.current = popupToast(
                                ({ toast }) => (
                                    <StandardToast.Error
                                        message={`Couldn't create town.`}
                                        subMessage={errorMessage}
                                        toast={toast}
                                    />
                                ),
                                { duration: Infinity },
                            )
                        }
                        return
                    }

                    const spaceId = result?.data?.spaceId

                    if (result?.data && spaceId && result.data.channelId) {
                        const newPath = `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
                            PATHS.CHANNELS
                        }/${result.data.channelId}`

                        const trackedAnalytics = {
                            spaceName: createSpaceInfo.name,
                            spaceId,
                            channelId: result.data.channelId,
                            channelName: createSpaceInfo.defaultChannelName ?? 'general',
                            everyone: data.gatingType === 'everyone',
                            pricingModule: isFixedPricing ? 'fixed' : 'dynamic',
                            priceInWei: priceInWei.toString(),
                            townType: data.clientTownType,
                            paidModel: data.slideMembership.clientMembershipFee,
                            accessType: data.clientGateBy,
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

                        if (
                            data.slideNameAndIcon.spaceIconUrl &&
                            data.slideNameAndIcon.spaceIconFile
                        ) {
                            await uploadTownImageToStream(
                                spaceId,
                                data.slideNameAndIcon.spaceIconFile,
                                () => {},
                            )
                        }

                        let timeoutDuration = 0

                        try {
                            const spaceInfo = await spaceDapp?.getSpaceInfo(spaceId)
                            timeoutDuration = 3000
                            spaceInfoCache.mutate(spaceInfo)
                        } catch (error) {
                            console.error('error getting space info after creating town: ', error)
                        }

                        setTimeout(() => {
                            navigate(newPath, {
                                state: { fromCreateTown: true },
                            })
                        }, timeoutDuration)
                    }
                },
                (_errors) => {},
            )

            return submit()
        },
        [
            form,
            spaceDapp,
            platformMintLimit,
            createSpaceTransactionWithRole,
            onCreateSpaceFlowStatus,
            uploadTownImageToStream,
            spaceInfoCache,
            baseChainId,
            navigate,
        ],
    )

    return {
        onSubmit,
        isSubmitting,
        error,
    }
}

type PriceConfiguration = {
    freeAllocation: number
    pricingModule: string
    price: bigint
}

function getPriceConfiguration(args: {
    townType: CreateTownFormSchema['clientTownType']
    isFixedPricing: boolean
    fixedPricingModuleAddress: string | undefined
    dynamicPricingModuleAddress: string | undefined
    platformMintLimit: number | undefined
    price: bigint
    baseChainId: number
}): PriceConfiguration {
    const {
        townType,
        isFixedPricing,
        fixedPricingModuleAddress,
        dynamicPricingModuleAddress,
        platformMintLimit,
        price,
        baseChainId,
    } = args
    if (isFixedPricing) {
        if (!fixedPricingModuleAddress) {
            throw new Error('Fixed pricing module address is undefined')
        }
        if (townType === 'free') {
            if (platformMintLimit === undefined) {
                throw new Error('Platform mint limit is undefined')
            }

            return {
                freeAllocation:
                    // on dev/testnet make free allocation very low to easily test free allocation exceeded scenarios
                    baseChainId === LOCALHOST_CHAIN_ID || baseChainId === BASE_SEPOLIA
                        ? 2
                        : platformMintLimit,
                pricingModule: fixedPricingModuleAddress,
                price: 0n,
            }
        }
        return {
            freeAllocation: 0,
            pricingModule: fixedPricingModuleAddress,
            price,
        }
    }
    if (!dynamicPricingModuleAddress) {
        throw new Error('Dynamic pricing module address is undefined')
    }
    return {
        freeAllocation: 0,
        pricingModule: dynamicPricingModuleAddress,
        price: 0n,
    }
}
