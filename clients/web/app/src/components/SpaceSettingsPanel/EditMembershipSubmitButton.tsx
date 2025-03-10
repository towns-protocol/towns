import React, { useMemo } from 'react'
import {
    TransactionStatus,
    findDynamicPricingModule,
    findFixedPricingModule,
    useEditSpaceMembershipTransaction,
    usePricingModuleForMembership,
    usePricingModules,
    useRoleDetails,
} from 'use-towns-client'
import { SubmitErrorHandler, useFormContext } from 'react-hook-form'
import isEqual from 'lodash/isEqual'
import { useEvent } from 'react-use-event-hook'
import { Button } from '@ui'
import { parseUnits } from 'hooks/useBalance'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { prepareGatedDataForSubmit } from '@components/Tokens/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { EditMembershipSchemaType } from './editMembershipSchema'

export function EditMembershipSubmitButton({
    children,
    spaceId,
    transactionIsPending,
    pricingModules,
    minimumMembershipPrice,
    isLoadingPricingModules,
    isLoadingRoleDetails,
    roleDetails,
    currentPricingModule,
    isCurrentlyFree,
    isCurrentlyDynamic,
}: {
    children?: React.ReactNode
    spaceId: string | undefined
    transactionIsPending: boolean
    pricingModules: ReturnType<typeof usePricingModules>['data']
    minimumMembershipPrice: ReturnType<typeof usePlatformMinMembershipPriceInEth>['data']
    isLoadingPricingModules: boolean
    isLoadingRoleDetails: boolean
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails']
    currentPricingModule: ReturnType<typeof usePricingModuleForMembership>['data']
    isCurrentlyFree: boolean
    isCurrentlyDynamic: boolean
}) {
    const { handleSubmit, formState, watch, setError } = useFormContext<EditMembershipSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { editSpaceMembershipTransaction } = useEditSpaceMembershipTransaction()
    const { closePanel } = usePanelActions()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        function sorter(arr: typeof defaultValues | undefined) {
            arr?.tokensGatedBy?.sort()
        }
        sorter(def)
        sorter(cur)

        return isEqual(def, cur)
    }, [defaultValues, watchAllFields])

    const isDisabled =
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0 ||
        (watchAllFields.gatingType === 'gated' &&
            watchAllFields.tokensGatedBy.length === 0 &&
            watchAllFields.usersGatedBy.length === 0 &&
            !watchAllFields.ethBalanceGatedBy) ||
        isLoadingPricingModules ||
        isLoadingRoleDetails ||
        transactionIsPending

    const isSubmittedRef = React.useRef(false)

    const onValid = useEvent(async (data: EditMembershipSchemaType, getSigner: GetSigner) => {
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
        let priceInWei

        try {
            priceInWei = parseUnits(data.membershipCost)
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

        const nextPricingModuleIsFixed = watchAllFields.membershipPricingType === 'fixed'
        const isSwitchingToFixedPriceFromDynamic = isCurrentlyDynamic && nextPricingModuleIsFixed

        // when switching to fixed price from dynamic, or if the fixed price space has a non-zero price,
        // the updated price must be at least the minimum price
        // or else the contract will revert
        if (
            (isSwitchingToFixedPriceFromDynamic || !isCurrentlyFree) &&
            minimumMembershipPrice !== undefined &&
            nextPricingModuleIsFixed &&
            priceInWei < parseUnits(minimumMembershipPrice)
        ) {
            setError('membershipCost', {
                type: 'manual',
                message: `Fixed price must be at least ${minimumMembershipPrice} ETH`,
            })
            return
        }

        let pricingModuleToSubmit: string
        if (nextPricingModuleIsFixed && fixedPricingModule) {
            pricingModuleToSubmit = await fixedPricingModule.module
        }
        // dynamic priced spaces cannot currently be updated to a different module, so we just submit the current module
        // if this changes in the future, the editMembership user operation will also need to handle this
        else if (dynamicPricingModule && currentPricingModule?.address) {
            pricingModuleToSubmit = currentPricingModule.address
        } else {
            console.warn('No pricing module to submit')
            setPricingModuleError()
            return
        }

        const { usersGatedBy, ruleData } = prepareGatedDataForSubmit(
            data.gatingType,
            data.tokensGatedBy,
            data.usersGatedBy,
            data.ethBalanceGatedBy,
        )

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
        <WalletReady>
            {({ getSigner }) => (
                <Button
                    data-testid="submit-button"
                    disabled={isDisabled}
                    tone={isDisabled ? 'level2' : 'cta1'}
                    style={{
                        pointerEvents: isDisabled ? 'none' : 'initial',
                    }}
                    onClick={handleSubmit((data) => onValid(data, getSigner), onInvalid)}
                >
                    {children}
                </Button>
            )}
        </WalletReady>
    )
}
