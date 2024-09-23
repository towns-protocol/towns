import React, { useMemo } from 'react'
import {
    Address,
    BlockchainTransactionType,
    IRuleEntitlementV2Base,
    NoopRuleData,
    PricingModuleStruct,
    TransactionStatus,
    convertRuleDataV1ToV2,
    createOperationsTree,
    findDynamicPricingModule,
    findFixedPricingModule,
    useEditSpaceMembershipTransaction,
    useIsTransactionPending,
    useMembershipFreeAllocation,
    useMembershipInfo,
    usePricingModuleForMembership,
    usePricingModules,
    useRoleDetails,
} from 'use-towns-client'
import { BigNumberish, ethers } from 'ethers'
import { FormProvider, SubmitErrorHandler, UseFormReturn, useFormContext } from 'react-hook-form'
import { useGetEmbeddedSigner } from '@towns/privy'
import isEqual from 'lodash/isEqual'
import { useEvent } from 'react-use-event-hook'
import { Button, FormRender, Icon, Paragraph, Stack, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import {
    convertRuleDataToTokenEntitlementSchema,
    convertRuleDataToTokenSchema,
    convertTokenTypeToOperationType,
    transformQuantityForSubmit,
} from '@components/Tokens/utils'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { isEveryoneAddress } from '@components/Web3/utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { EVERYONE_ADDRESS } from 'utils'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { useMultipleTokenMetadatasForChainIds } from 'api/lib/collectionMetadata'
import { EditMembershipSchemaType, editMembershipSchema } from './editMembershipSchema'

export const EDIT_MEMBERSHIP_SETTINGS_PANEL = 'editMembershipSettings'

export const EditMembershipSettingsPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <EditMembershipSettingsPanelWithoutAuth />
        </PrivyWrapper>
    )
})

function EditMembershipSettingsPanelWithoutAuth() {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const { data, isLoading } = useMembershipInfoAndRoleDetails(spaceIdFromPath)
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )
    return (
        <>
            <Stack gap grow position="relative" overflow="auto">
                {isLoading ? (
                    <Stack grow centerContent>
                        <ButtonSpinner />
                    </Stack>
                ) : data ? (
                    <EditMembershipForm defaultFormData={data} spaceId={spaceIdFromPath} />
                ) : (
                    <Paragraph>Failed to load membership info</Paragraph>
                )}
            </Stack>
            {transactionIsPending && <FullPanelOverlay text="" withSpinner={false} />}
        </>
    )
}

function EditMembershipForm({
    defaultFormData,
    spaceId,
}: {
    defaultFormData: NonNullable<ReturnType<typeof useMembershipInfoAndRoleDetails>['data']>
    spaceId: string | undefined
}) {
    const environment = useEnvironment()
    const { membershipInfo, pricingModule, roleDetails } = defaultFormData
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )
    const { data: freeAllocation } = useMembershipFreeAllocation(spaceId)

    const ruleData: IRuleEntitlementV2Base.RuleDataV2Struct | undefined =
        roleDetails?.ruleData.kind === 'v1'
            ? convertRuleDataV1ToV2(roleDetails.ruleData.rules)
            : roleDetails?.ruleData.rules

    const initialTokenValues = useMemo(
        () => (ruleData ? convertRuleDataToTokenSchema(ruleData) : []),
        [ruleData],
    )

    const { data: clientTokensGatedBy, isLoading: isLoadingTokensData } =
        useMultipleTokenMetadatasForChainIds(initialTokenValues)

    const { data: pricingModules, isLoading: isLoadingPricingModules } = usePricingModules()

    const gatingType = useMemo(() => {
        if (initialTokenValues.length > 0) {
            return 'gated'
        }
        return roleDetails?.users?.some((address) => !isEveryoneAddress(address))
            ? 'gated'
            : 'everyone'
    }, [roleDetails, initialTokenValues.length])

    const usersGatedBy = useMemo(() => {
        return (roleDetails?.users || []).filter(
            (address) => !isEveryoneAddress(address),
        ) as Address[]
    }, [roleDetails])

    const defaultValues: EditMembershipSchemaType = useMemo(
        () => ({
            gatingType,
            tokensGatedBy: ruleData ? convertRuleDataToTokenEntitlementSchema(ruleData) : [],
            clientTokensGatedBy,
            usersGatedBy,
            membershipLimit: Number(membershipInfo?.maxSupply) ?? 0,
            membershipCost: ethers.utils.formatEther((membershipInfo?.price as BigNumberish) ?? 0),
            membershipPricingType: pricingModule?.isFixed ? 'fixed' : 'dynamic',
            clientPricingOption: pricingModule?.isFixed ? 'fixed' : 'dynamic',
            membershipCurrency:
                (membershipInfo?.currency as string) ?? ethers.constants.AddressZero,
            prepaidMemberships: 0,
        }),
        [gatingType, clientTokensGatedBy, usersGatedBy, membershipInfo, pricingModule, ruleData],
    )

    if (isLoadingTokensData) {
        return <ButtonSpinner />
    }

    return (
        <>
            <FormRender schema={editMembershipSchema} defaultValues={defaultValues} mode="all">
                {(hookForm) => {
                    const _form = hookForm as unknown as UseFormReturn<EditMembershipSchemaType>
                    const watchPricingField = _form.watch(['membershipPricingType'])
                    const isFixedPricingSelected = watchPricingField[0] === 'fixed'

                    return (
                        <FormProvider {..._form}>
                            <Stack gap grow>
                                <Paragraph strong>Who Can Join</Paragraph>
                                <EditGating />

                                {environment.accountAbstractionConfig && (
                                    <>
                                        <Paragraph strong>Pricing</Paragraph>
                                        {!pricingModule?.isFixed && isFixedPricingSelected && (
                                            <Stack
                                                horizontal
                                                background="level2"
                                                padding="md"
                                                gap="sm"
                                                rounded="sm"
                                                alignItems="center"
                                            >
                                                <Icon
                                                    type="info"
                                                    color="negative"
                                                    size="square_sm"
                                                />
                                                <Text size="sm">
                                                    {`This space is using dynamic pricing. If you
                        switch to fixed pricing, you can't go back.`}
                                                </Text>
                                            </Stack>
                                        )}
                                        <EditPricing
                                            isEditMode
                                            freeAllocation={freeAllocation}
                                            pricingModules={pricingModules}
                                            isLoadingPricingModules={isLoadingPricingModules}
                                        />

                                        <Paragraph strong>Membership</Paragraph>
                                        <EditMembership />
                                    </>
                                )}

                                <SubmitButton
                                    spaceId={spaceId}
                                    transactionIsPending={transactionIsPending}
                                    pricingModules={pricingModules}
                                    isLoadingPricingModules={isLoadingPricingModules}
                                >
                                    Update
                                </SubmitButton>
                            </Stack>
                        </FormProvider>
                    )
                }}
            </FormRender>
            <UserOpTxModal />
        </>
    )
}

function useMembershipInfoAndRoleDetails(spaceId: string | undefined) {
    const {
        data: membershipInfo,
        isLoading: isLoadingMembershipInfo,
        error: membershipInfoError,
    } = useMembershipInfo(spaceId ?? '')
    // get role details of the minter role
    // TBD will xchain entitlements change this?
    const {
        isLoading: isLoadingRoleDetails,
        roleDetails,
        error: roleDetailsError,
    } = useRoleDetails(spaceId ?? '', 1)

    const { data: membershipPricingModule, isLoading: isLoadingMembershipPricingModule } =
        usePricingModuleForMembership(spaceId)

    return useMemo(() => {
        if (!spaceId) {
            return { isLoading: false, data: undefined, error: undefined }
        }
        if (isLoadingMembershipInfo || isLoadingRoleDetails || isLoadingMembershipPricingModule) {
            return { isLoading: true, data: undefined, error: undefined }
        }
        if (membershipInfoError || roleDetailsError) {
            return {
                isLoading: false,
                data: undefined,
                error: membershipInfoError || roleDetailsError,
            }
        }
        return {
            isLoading: false,
            data: { membershipInfo, roleDetails, pricingModule: membershipPricingModule },
            error: undefined,
        }
    }, [
        isLoadingMembershipInfo,
        isLoadingMembershipPricingModule,
        isLoadingRoleDetails,
        membershipInfo,
        membershipInfoError,
        membershipPricingModule,
        roleDetails,
        roleDetailsError,
        spaceId,
    ])
}

function SubmitButton({
    children,
    spaceId,
    transactionIsPending,
    pricingModules,
    isLoadingPricingModules,
}: {
    children?: React.ReactNode
    spaceId: string | undefined
    transactionIsPending: boolean
    pricingModules: PricingModuleStruct[] | undefined
    isLoadingPricingModules: boolean
}) {
    const { handleSubmit, formState, watch, setError } = useFormContext<EditMembershipSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const { editSpaceMembershipTransaction } = useEditSpaceMembershipTransaction()

    const { roleDetails, isLoading: isLoadingRoleDetails } = useRoleDetails(spaceId ?? '', 1)
    const { closePanel } = usePanelActions()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        function sorter(arr: typeof defaultValues | undefined) {
            arr?.clientTokensGatedBy?.sort()
        }
        sorter(def)
        sorter(cur)

        return isEqual(def, cur)
    }, [defaultValues, watchAllFields])

    const isDisabled =
        !isPrivyReady ||
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0 ||
        (watchAllFields.gatingType === 'gated' &&
            watchAllFields.clientTokensGatedBy.length === 0 &&
            watchAllFields.usersGatedBy.length === 0) ||
        isLoadingPricingModules ||
        isLoadingRoleDetails ||
        transactionIsPending

    const isSubmittedRef = React.useRef(false)

    const { data: minimumMmebershipPrice } = usePlatformMinMembershipPriceInEth()

    const onValid = useEvent(async (data: EditMembershipSchemaType) => {
        if (
            !spaceId ||
            !roleDetails ||
            transactionIsPending ||
            isLoadingPricingModules ||
            isSubmittedRef.current
        ) {
            return
        }

        //////////////////////////////////////////
        // check pricing
        //////////////////////////////////////////
        let priceInWei: ethers.BigNumberish

        try {
            priceInWei = ethers.utils.parseEther(data.membershipCost)
        } catch (error) {
            setError('membershipCost', {
                type: 'manual',
                message: 'Please enter a valid eth value.',
            })
            return
        }

        const setPricingModuleError = () => {
            setError('membershipPricingType', {
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

        const isFixedPricing = watchAllFields.membershipPricingType === 'fixed'

        if (
            minimumMmebershipPrice !== undefined &&
            isFixedPricing &&
            priceInWei.lt(ethers.utils.parseEther(minimumMmebershipPrice))
        ) {
            setError('membershipPricingType', {
                type: 'manual',
                message: `Fixed price must be at least ${minimumMmebershipPrice} ETH`,
            })
            return
        }

        let pricingModuleToSubmit: string
        if (isFixedPricing && fixedPricingModule) {
            pricingModuleToSubmit = await fixedPricingModule.module
        } else if (dynamicPricingModule) {
            pricingModuleToSubmit = await dynamicPricingModule.module
        } else {
            console.warn('No pricing module to submit')
            setPricingModuleError()
            return
        }

        // If gatedType is everyone, usersGatedBy should be the everyone address
        const usersGatedBy = data.gatingType === 'everyone' ? [EVERYONE_ADDRESS] : data.usersGatedBy

        // If gatedType is everyone, tokensGatedBy should be empty
        const tokensGatedBy = data.gatingType === 'everyone' ? [] : data.clientTokensGatedBy

        const ruleData =
            tokensGatedBy.length > 0
                ? createOperationsTree(
                      tokensGatedBy.map((t) => ({
                          address: t.data.address as Address,
                          chainId: BigInt(t.chainId),
                          type: convertTokenTypeToOperationType(t.data.type),
                          threshold: t.data.quantity
                              ? transformQuantityForSubmit(
                                    t.data.quantity,
                                    t.data.type,
                                    t.data.decimals,
                                )
                              : 1n,
                          tokenId: t.data.tokenId ? BigInt(t.data.tokenId) : undefined,
                      })),
                  )
                : NoopRuleData

        isSubmittedRef.current = true

        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            isSubmittedRef.current = false
            return
        }

        const txContext = await editSpaceMembershipTransaction({
            spaceId,
            updateRoleParams: {
                roleId: 1,
                roleName: roleDetails.name,
                permissions: roleDetails.permissions,
                spaceNetworkId: spaceId,
                users: usersGatedBy,
                ruleData,
            },
            membershipParams: {
                membershipPrice: priceInWei,
                membershipSupply: data.membershipLimit,
                pricingModule: pricingModuleToSubmit,
            },
            signer,
        })

        isSubmittedRef.current = false

        if (txContext?.status === TransactionStatus.Success) {
            closePanel()
        }
    })

    const onInvalid: SubmitErrorHandler<EditMembershipSchemaType> = useEvent((errors) => {
        console.error(errors)
    })

    return (
        <Button
            data-testid="submit-button"
            disabled={isDisabled}
            tone={isDisabled ? 'level2' : 'cta1'}
            style={{
                pointerEvents: isDisabled ? 'none' : 'initial',
            }}
            onClick={handleSubmit(onValid, onInvalid)}
        >
            {children}
        </Button>
    )
}
