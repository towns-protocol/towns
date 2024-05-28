import React, { ChangeEvent, useCallback } from 'react'
import { UseFormReturn, useFormContext } from 'react-hook-form'
import { ErrorMessage, RadioCard, Stack, TextField } from '@ui'
import { FadeInBox } from '@components/Transitions'
import {
    MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH,
    MembershipSettingsSchemaType,
} from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

export function EditPricing({
    // currently, a space cannot switch from fixed to dynamic pricing
    enableDynamicPricing = true,
}: {
    enableDynamicPricing?: boolean
}) {
    const { formState, setValue, watch, trigger } = useFormContext<MembershipSettingsSchemaType>()

    const formProps = useFormContext<MembershipSettingsSchemaType>()

    const [price] = watch(['membershipCost', 'membershipLimit'])
    const [priceType] = watch(['membershipPricingType'])

    const onCostChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target

            if (value.includes('.')) {
                const priceHasDecimalAlready = price.toString().includes('.')
                const [, decimal] = value.split('.')

                // user deleted the only decimal number
                if (!decimal && priceHasDecimalAlready) {
                    // strip the "." from the value and set to integer
                    setValue('membershipCost', value, {
                        shouldValidate: true,
                    })
                    return
                }
                // user added decimal but hasn't enterd any numbers after it
                if (!decimal) {
                    return
                }
            }

            setValue('membershipCost', value, {
                shouldValidate: true,
            })

            trigger('membershipCost') // trigger the superRefine
        },
        [setValue, trigger, price],
    )

    const regiserTextFieldResult = formProps.register('membershipCost')

    const onDynamicClick = useCallback((formProps: UseFormReturn<MembershipSettingsSchemaType>) => {
        formProps.setValue('membershipPricingType', 'dynamic')
        formProps.setValue('membershipCost', '0.0', {
            shouldValidate: true,
        })
    }, [])

    const onFixedClick = useCallback((formProps: UseFormReturn<MembershipSettingsSchemaType>) => {
        if (formProps.getValues('membershipPricingType') === 'fixed') {
            return
        }
        formProps.setValue('membershipPricingType', 'fixed')
        formProps.setValue('membershipCost', MIN_FIXED_COST_OF_MEMBERSHIP_IN_ETH.toString(), {
            shouldValidate: true,
        })
    }, [])

    return (
        <Stack gap="sm" rounded="md">
            {enableDynamicPricing && (
                <RadioCard
                    name="membershipPricingType"
                    value="dynamic"
                    title="Dynamic"
                    description="Free for the first 100 members, then logarithmically increasing price."
                    onClick={() => onDynamicClick(formProps)}
                    {...formProps}
                />
            )}
            <RadioCard
                name="membershipPricingType"
                value="fixed"
                title="Fixed"
                description="Everyone pays the same price."
                onClick={() => onFixedClick(formProps)}
                {...formProps}
            >
                {() => {
                    if (priceType !== 'fixed') {
                        return null
                    }
                    return (
                        <>
                            <TextField
                                autoFocus
                                background="level3"
                                autoComplete="one-time-code"
                                {...regiserTextFieldResult}
                                border={
                                    formProps.formState.errors['membershipCost']
                                        ? 'negative'
                                        : undefined
                                }
                                onChange={onCostChange}
                            />
                        </>
                    )
                }}
            </RadioCard>
            {formState.errors['membershipCost'] ? (
                <FadeInBox key="error">
                    <ErrorMessage errors={formState.errors} fieldName="membershipCost" />
                </FadeInBox>
            ) : (
                <>&nbsp;</>
            )}
        </Stack>
    )
}
