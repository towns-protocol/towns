import React, { useMemo } from 'react'
import {
    Address,
    BlockchainTransactionType,
    IRuleEntitlementV2Base,
    NoopRuleData,
    TransactionStatus,
    convertRuleDataV1ToV2,
    createOperationsTree,
    findDynamicPricingModule,
    findFixedPricingModule,
    useEditSpaceMembershipTransaction,
    useIsTransactionPending,
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
    convertRuleDataToTokenFormSchema,
    convertTokenTypeToOperationType,
} from '@components/Tokens/utils'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { EVERYONE_ADDRESS } from 'utils'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
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

    const ruleData: IRuleEntitlementV2Base.RuleDataV2Struct | undefined =
        roleDetails?.ruleData.kind === 'v1'
            ? convertRuleDataV1ToV2(roleDetails.ruleData.rules)
            : roleDetails?.ruleData.rules

    const defaultTokens = ruleData ? convertRuleDataToTokenFormSchema(ruleData) : []

    const defaultValues: EditMembershipSchemaType = {
        membershipType: defaultTokens.length > 0 ? 'tokenHolders' : 'everyone',
        membershipLimit: Number(membershipInfo?.maxSupply) ?? 0,
        membershipCost: ethers.utils.formatEther((membershipInfo?.price as BigNumberish) ?? 0),
        membershipPricingType: pricingModule?.isFixed ? 'fixed' : 'dynamic',
        tokensGatingMembership: defaultTokens,
        // TODO: currency defaults to ETH when addressZero
        membershipCurrency: (membershipInfo?.currency as string) ?? ethers.constants.AddressZero,
        prepaidMemberships: 0,
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

                                {/* if there's no abstract account config (local/anvil), for now just update the role */}
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
                                            enableDynamicPricing={!pricingModule?.isFixed}
                                        />

                                        <Paragraph strong>Membership</Paragraph>
                                        <EditMembership />
                                    </>
                                )}

                                <SubmitButton
                                    spaceId={spaceId}
                                    transactionIsPending={transactionIsPending}
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
}: {
    children?: React.ReactNode
    spaceId: string | undefined
    transactionIsPending: boolean
}) {
    const { handleSubmit, formState, watch, setError } = useFormContext<EditMembershipSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const { editSpaceMembershipTransaction } = useEditSpaceMembershipTransaction()
    const { data: pricingModules, isLoading: isLoadingPricingModules } = usePricingModules()
    const { roleDetails, isLoading: isLoadingRoleDetails } = useRoleDetails(spaceId ?? '', 1)
    const { closePanel } = usePanelActions()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        function sorter(arr: typeof defaultValues | undefined) {
            arr?.tokensGatingMembership?.sort()
            arr?.tokensGatingMembership?.forEach((t) => t?.tokenIds?.sort())
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
        (watchAllFields.membershipType === 'tokenHolders' &&
            watchAllFields.tokensGatingMembership.length === 0) ||
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

        //////////////////////////////////////////
        // check quantity
        //////////////////////////////////////////
        if (data.tokensGatingMembership.length > 0) {
            const missingQuantity = data.tokensGatingMembership.some(
                (token) => token.quantity === 0n || token.quantity === undefined,
            )
            if (missingQuantity) {
                setError('tokensGatingMembership', {
                    type: 'manual',
                    message: 'Please enter a valid quantity.',
                })
                return
            }
        }

        const ruleData =
            data.tokensGatingMembership.length > 0
                ? createOperationsTree(
                      data.tokensGatingMembership.map((t) => ({
                          address: t.address as Address,
                          chainId: BigInt(t.chainId),
                          type: convertTokenTypeToOperationType(t.type),
                          threshold: t.quantity,
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
                // at this time, the only thing we are updating is entitlements
                users: data.tokensGatingMembership.length > 0 ? [] : [EVERYONE_ADDRESS],
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
            // if (isTouch) {
            //     //
            // } else {
            //     openPanel(CHANNEL_INFO_PARAMS.TOWN_INFO)
            // }
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
