import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
    PricingModuleStruct,
    findDynamicPricingModule,
    findFixedPricingModule,
} from 'use-towns-client'
import { FadeInBox } from '@components/Transitions'
import { MembershipSettingsSchemaType } from '@components/SpaceSettingsPanel/membershipSettingsSchema'
import { ErrorMessage, Paragraph, RadioCard, Stack, TextField } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { TOWNS_PRICING_TERMS_LINK } from 'data/links'
import { atoms } from 'ui/styles/atoms.css'
import { useEthInputChange } from './useEthInputChange'

enum PricingPreset {
    Dynamic = 'dynamic',
    Fixed = 'fixed',
    Prepaid = 'prepaid',
}

const isPricingPreset = (preset: string): preset is PricingPreset => {
    return Object.values(PricingPreset).includes(preset as PricingPreset)
}

export function EditPricing({
    pricingModules,
    isLoadingPricingModules,
    minimumMembershipPrice,
    isLoadingMinMembershipPrice,
    isFixed,
    isFree,
}: {
    pricingModules?: PricingModuleStruct[]
    isLoadingPricingModules?: boolean
    minimumMembershipPrice?: string
    isLoadingMinMembershipPrice?: boolean
    isFree?: boolean
    isFixed?: boolean
}) {
    const { formState, setValue, watch, trigger } = useFormContext<MembershipSettingsSchemaType>()

    const formProps = useFormContext<MembershipSettingsSchemaType>()

    const [price] = watch(['membershipCost', 'membershipLimit'])

    const onCostChange = useEthInputChange(price, 'membershipCost', setValue, trigger)

    const [pricingPreset, setPricingPreset] = useState<PricingPreset>(() => {
        const preset = formProps.getValues().clientPricingOption
        return isPricingPreset(preset) ? preset : PricingPreset.Dynamic
    })

    const prepaidMemberships = watch('prepaidMemberships')
    const membershipCost = watch('membershipCost')

    const presetRef = useRef({
        prepaidMemberships: 0,
        membershipCost: minimumMembershipPrice,
    })

    useEffect(() => {
        if (pricingPreset === 'prepaid') {
            presetRef.current.prepaidMemberships = prepaidMemberships
        }
        if (pricingPreset === 'fixed') {
            presetRef.current.membershipCost = membershipCost
        }
    }, [membershipCost, prepaidMemberships, pricingPreset])

    const onSelectPricingPreset = useCallback(
        (preset: typeof pricingPreset) => {
            setPricingPreset(preset)
            formProps.setValue('clientPricingOption', preset)

            switch (preset) {
                case 'dynamic': {
                    formProps.setValue('membershipPricingType', 'dynamic')
                    formProps.setValue('prepaidMemberships', 0)
                    formProps.setValue('membershipCost', '0.0', {
                        shouldValidate: true,
                    })
                    break
                }
                case 'fixed': {
                    formProps.setValue('membershipPricingType', 'fixed')
                    formProps.setValue('prepaidMemberships', 0)
                    formProps.setValue(
                        'membershipCost',
                        presetRef.current.membershipCost ?? minimumMembershipPrice ?? '',
                        {
                            shouldValidate: false,
                        },
                    )
                    break
                }
                case 'prepaid': {
                    formProps.setValue('membershipPricingType', 'dynamic')
                    formProps.setValue('membershipCost', '0.0', {
                        shouldValidate: true,
                    })
                    formProps.setValue(
                        'prepaidMemberships',
                        presetRef.current.prepaidMemberships ?? 0,
                    )
                    break
                }
            }
        },
        [formProps, minimumMembershipPrice],
    )

    const enabledPricingModules = useMemo(() => {
        if (pricingModules) {
            return [
                findDynamicPricingModule(pricingModules) ? ('dynamic' as const) : undefined,
                findFixedPricingModule(pricingModules) ? ('fixed' as const) : undefined,
            ].filter(Boolean)
        }
    }, [pricingModules])

    // 3.6.25
    // we're going to be updating this form to allow for swtiching between different pricing modules
    // for now, only allowing dynamic -> fixed
    // so, dynamic should only show if a space is using dynamic pricing
    const showDynamicPricing = enabledPricingModules?.includes('dynamic') && !isFixed
    // fixed can show if a space is using fixed pricing or dynamic pricing
    const showFixedPricing = enabledPricingModules?.includes('fixed')

    if (isLoadingPricingModules) {
        return (
            <Stack
                padding
                gap="sm"
                rounded="sm"
                color="gray2"
                background="level2"
                className={shimmerClass}
            >
                <Stack horizontal gap="sm">
                    <Paragraph>Loading pricing modules</Paragraph>
                </Stack>
            </Stack>
        )
    }

    return (
        <Stack gap="sm">
            {showDynamicPricing && (
                <RadioCard
                    selected={pricingPreset === PricingPreset.Dynamic}
                    name="clientPricingOption"
                    value="dynamic"
                    title="Dynamic"
                    description="Logarithmically increasing price"
                    dataTestId="membership-pricing-type-dynamic"
                    onClick={() => onSelectPricingPreset(PricingPreset.Dynamic)}
                    {...formProps}
                />
            )}
            {showFixedPricing && isFree && (
                <RadioCard
                    selected={pricingPreset === PricingPreset.Fixed}
                    name="clientPricingOption"
                    value="fixed"
                    title="Free"
                    description={
                        <>
                            Town is free to join.{' '}
                            <a
                                href={TOWNS_PRICING_TERMS_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={atoms({
                                    textDecoration: 'underline',
                                })}
                            >
                                Terms
                            </a>{' '}
                            apply.
                        </>
                    }
                    dataTestId="membership-pricing-type-fixed-free"
                    {...formProps}
                />
            )}
            {showFixedPricing && !isFree && (
                <RadioCard
                    selected={pricingPreset === PricingPreset.Fixed}
                    name="clientPricingOption"
                    value="fixed"
                    title="Fixed"
                    description="Everyone pays the same price"
                    dataTestId="membership-pricing-type-fixed"
                    onClick={() => onSelectPricingPreset(PricingPreset.Fixed)}
                    {...formProps}
                >
                    {pricingPreset === PricingPreset.Fixed ? (
                        <TextField
                            autoFocus
                            background="level3"
                            autoComplete="one-time-code"
                            data-testid="fixed-town-membership-cost"
                            {...formProps.register('membershipCost')}
                            disabled={isLoadingMinMembershipPrice}
                            border={
                                formProps.formState.errors['membershipCost']
                                    ? 'negative'
                                    : undefined
                            }
                            onChange={(e) => onCostChange(e.target.value)}
                        />
                    ) : null}
                </RadioCard>
            )}
            {formState.errors['membershipCost'] ? (
                <FadeInBox key="error">
                    <ErrorMessage errors={formState.errors} fieldName="membershipCost" />
                </FadeInBox>
            ) : formState.errors['prepaidMemberships'] ? (
                <FadeInBox key="error">
                    <ErrorMessage errors={formState.errors} fieldName="prepaidMemberships" />
                </FadeInBox>
            ) : formState.errors['membershipPricingType'] ? (
                <FadeInBox key="error">
                    <ErrorMessage errors={formState.errors} fieldName="membershipPricingType" />
                </FadeInBox>
            ) : null}
        </Stack>
    )
}
