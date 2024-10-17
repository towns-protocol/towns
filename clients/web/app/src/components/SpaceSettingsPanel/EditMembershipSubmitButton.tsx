import React, { useMemo } from 'react'
import {
    TransactionStatus,
    findDynamicPricingModule,
    findFixedPricingModule,
    useEditSpaceMembershipTransaction,
    usePricingModules,
    useRoleDetails,
} from 'use-towns-client'
import { SubmitErrorHandler, useFormContext } from 'react-hook-form'
import { useGetEmbeddedSigner } from '@towns/privy'
import isEqual from 'lodash/isEqual'
import { useEvent } from 'react-use-event-hook'
import { Button } from '@ui'
import { parseUnits } from 'hooks/useBalance'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { prepareGatedDataForSubmit } from '@components/Tokens/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { EditMembershipSchemaType } from './editMembershipSchema'

export function EditMembershipSubmitButton({
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
            arr?.tokensGatedBy?.sort()
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
            watchAllFields.tokensGatedBy.length === 0 &&
            watchAllFields.usersGatedBy.length === 0 &&
            !watchAllFields.ethBalanceGatedBy) ||
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

        const isFixedPricing = watchAllFields.membershipPricingType === 'fixed'

        if (
            minimumMmebershipPrice !== undefined &&
            isFixedPricing &&
            priceInWei < parseUnits(minimumMmebershipPrice)
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
