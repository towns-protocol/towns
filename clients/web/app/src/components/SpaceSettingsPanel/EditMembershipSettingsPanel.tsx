import React, { useMemo } from 'react'
import {
    Address,
    BlockchainTransactionType,
    NoopRuleData,
    TransactionStatus,
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
import { MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { EVERYONE_ADDRESS } from 'utils'
import { EditMembershipSchemaType, editMembershipSchema } from './editMembershipSchema'

export const EDIT_MEMBERSHIP_SETTINGS_PANEL = 'editMembershipSettings'

export function EditMembershipSettingsPanel() {
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
                    <PrivyWrapper>
                        <EditMembershipForm defaultFormData={data} spaceId={spaceIdFromPath} />
                    </PrivyWrapper>
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

    const defaultTokens = roleDetails?.ruleData
        ? convertRuleDataToTokenFormSchema(roleDetails?.ruleData)
        : []

    const defaultValues: EditMembershipSchemaType = {
        membershipType: defaultTokens.length > 0 ? 'tokenHolders' : 'everyone',
        membershipLimit: Number(membershipInfo?.maxSupply) ?? 0,
        membershipCost: ethers.utils.formatEther((membershipInfo?.price as BigNumberish) ?? 0),
        membershipPricingType: pricingModule?.isFixed ? 'fixed' : 'dynamic',
        tokensGatingMembership: defaultTokens,
        // TODO: currency defaults to ETH when addressZero
        membershipCurrency: membershipInfo?.currency
            ? (membershipInfo.currency as string)
            : ethers.constants.AddressZero,
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
    const getSigner = useGetEmbeddedSigner()
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
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0 ||
        (watchAllFields.membershipType === 'tokenHolders' &&
            watchAllFields.tokensGatingMembership.length === 0) ||
        isLoadingPricingModules ||
        isLoadingRoleDetails ||
        transactionIsPending

    const isSubmittedRef = React.useRef(false)

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

        if (!dynamicPricingModule || !fixedPricingModule) {
            console.warn('Cannot find dynamic pricing or fixed pricing modules')
            setPricingModuleError()
            return
        }

        const isFixedPricing = watchAllFields.membershipPricingType === 'fixed'

        if (
            isFixedPricing &&
            priceInWei.lt(ethers.utils.parseEther(MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH.toString()))
        ) {
            setError('membershipPricingType', {
                type: 'manual',
                message: `Fixed price must be at least ${MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH} ETH`,
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
        if (data.tokensGatingMembership.length > 0) {
            const missingQuantity = data.tokensGatingMembership.some(
                (token) => token.quantity === 0 || token.quantity === undefined,
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
        console.log(errors)
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
