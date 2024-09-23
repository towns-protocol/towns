import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { usePlatformMembershipPriceForSupplyInEth, usePlatformMintLimit } from 'use-towns-client'
import { FadeInBox } from '@components/Transitions'
import { Box, ErrorMessage, Paragraph, RadioCard, Stack, TextField } from '@ui'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { MembershipSettingsSchemaType } from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

enum PricingPreset {
    Dynamic = 'dynamic',
    Fixed = 'fixed',
    Prepaid = 'prepaid',
}

export function EditPricing({
    // currently, a space cannot switch from fixed to dynamic pricing
    enableDynamicPricing = true,
    freeAllocation,
}: {
    enableDynamicPricing?: boolean
    freeAllocation: number | undefined
}) {
    const { formState, setValue, watch, trigger } = useFormContext<MembershipSettingsSchemaType>()
    const { data: minimumMemebershipPrice, isLoading: isLoadingMinMembershipPrice } =
        usePlatformMinMembershipPriceInEth()

    const formProps = useFormContext<MembershipSettingsSchemaType>()

    const [price] = watch(['membershipCost', 'membershipLimit'])

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

    const [pricingPreset, setPricingPreset] = useState<PricingPreset>(PricingPreset.Dynamic)

    const prepaidMemberships = watch('prepaidMemberships')
    const membershipCost = watch('membershipCost')

    const presetRef = useRef({
        prepaidMemberships: 0,
        membershipCost: minimumMemebershipPrice,
    })

    useEffect(() => {
        if (pricingPreset === 'prepaid') {
            presetRef.current.prepaidMemberships = prepaidMemberships
        }
        if (pricingPreset === 'fixed') {
            presetRef.current.membershipCost = membershipCost
        }
    })

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
                        presetRef.current.membershipCost ?? minimumMemebershipPrice ?? '',
                        {
                            shouldValidate: false,
                        },
                    )
                    break
                }
                case 'prepaid': {
                    formProps.setValue('membershipPricingType', 'dynamic')
                    formProps.setValue(
                        'prepaidMemberships',
                        presetRef.current.prepaidMemberships ?? 0,
                        {
                            shouldValidate: true,
                        },
                    )
                }
            }
        },
        [formProps, minimumMemebershipPrice],
    )

    const { data: platformMintLimit } = usePlatformMintLimit()

    const { data: membershipFee } = usePlatformMembershipPriceForSupplyInEth(1)
    const { data: totalMembershipFee } =
        usePlatformMembershipPriceForSupplyInEth(prepaidMemberships)

    return (
        <Stack gap="sm" rounded="md">
            {enableDynamicPricing && (
                <RadioCard
                    selected={pricingPreset === PricingPreset.Dynamic}
                    name="clientPricingOption"
                    value="dynamic"
                    title="Dynamic"
                    description={`Free for the first ${freeAllocation} members, then logarithmically increasing price`}
                    dataTestId="membership-pricing-type-dynamic"
                    onClick={() => onSelectPricingPreset(PricingPreset.Dynamic)}
                    {...formProps}
                />
            )}
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
                        {...formProps.register('membershipCost')}
                        disabled={isLoadingMinMembershipPrice}
                        border={
                            formProps.formState.errors['membershipCost'] ? 'negative' : undefined
                        }
                        onChange={onCostChange}
                    />
                ) : null}
            </RadioCard>
            {enableDynamicPricing && (
                <RadioCard
                    name="clientPricingOption"
                    value="prepaid"
                    title="Prepaid"
                    description="Members join for free and don't pay any gas or River Protocol fees. Prepayment for fees over first 100 members is required"
                    dataTestId="membership-pricing-type-prepaid"
                    onClick={() => {
                        onSelectPricingPreset(PricingPreset.Prepaid)
                    }}
                    {...formProps}
                >
                    {pricingPreset === PricingPreset.Prepaid ? (
                        <Stack padding border gap="lg" borderRadius="sm">
                            <Stack horizontal>
                                <Box grow>
                                    <Paragraph>Prepaid memberships included</Paragraph>
                                </Box>
                                <Box>
                                    <Paragraph>{platformMintLimit}</Paragraph>
                                </Box>
                            </Stack>
                            <Stack horizontal>
                                <Box grow gap="sm" justifyContent="center">
                                    <Paragraph>Additional memberships</Paragraph>
                                    {membershipFee ? (
                                        <Paragraph size="sm" color="gray2">
                                            {membershipFee} ETH per member
                                        </Paragraph>
                                    ) : null}
                                </Box>
                                <Box>
                                    <TextField
                                        autoFocus
                                        width="100"
                                        step={100}
                                        background="level3"
                                        autoComplete="one-time-code"
                                        type="number"
                                        {...formProps.register('prepaidMemberships', {
                                            valueAsNumber: true,
                                        })}
                                        textAlign="right"
                                        border={
                                            formProps.formState.errors['prepaidMemberships']
                                                ? 'negative'
                                                : undefined
                                        }
                                    />
                                </Box>
                            </Stack>
                            <Stack height="x2">
                                <Box grow borderTop />
                            </Stack>

                            <Stack horizontal>
                                <Box grow gap="sm" justifyContent="center">
                                    <Paragraph fontWeight="strong">
                                        Total Prepaid Memberships
                                    </Paragraph>
                                </Box>
                                <Box>
                                    {totalMembershipFee ? (
                                        <Paragraph fontWeight="strong">
                                            {totalMembershipFee} ETH
                                        </Paragraph>
                                    ) : null}
                                </Box>
                            </Stack>
                        </Stack>
                    ) : null}
                </RadioCard>
            )}
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
