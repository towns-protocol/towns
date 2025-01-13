import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Address } from 'use-towns-client'
import {
    Box,
    ErrorMessage,
    MotionBox,
    MotionStack,
    Paragraph,
    RadioSelect,
    Stack,
    TextField,
} from '@ui'
import { FadeInBox } from '@components/Transitions'
import { TokenSelector } from '@components/Tokens/TokenSelector/TokenSelector'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { WalletMemberSelector } from '@components/SpaceSettingsPanel/WalletMemberSelector'
import { useDevice } from 'hooks/useDevice'
import { TOWNS_PRICING_TERMS_LINK } from 'data/links'
import { atoms } from 'ui/styles/atoms.css'
import { CreateTownFormReturn } from './types'
import {
    GATING_ENABLED,
    clientCanJoinOptions,
    clientGateByOptions,
    clientMembershipFeeOptions,
    clientTownTypeOptions,
} from './createTown.schema'
import { SlideLayout, SlideLayoutProps } from './components/SlideLayout'
import { RadioOption } from './components/RadioOption'
import { UploadImageField } from './components/ImageUploadField'
import { NextButton } from './components/NextButton'

type FormProps = { form: CreateTownFormReturn }
export type SlideProps = FormProps & {
    onNextSlide: (() => void) | undefined
    slideIndex: number
    numSlides: number
    isCurrentSlide: boolean
} & Omit<SlideLayoutProps, 'title' | 'description'>

export const TownName = (props: SlideProps) => {
    const { form, numSlides, onNextSlide } = props
    const [hasSubmitted, setHasSubmitted] = useState(false)

    form.watch('slideNameAndIcon')
    const { errors } = form.formState

    const { isTouch } = useDevice()

    return (
        <SlideLayout
            title="Town Name"
            renderLeft={
                !isTouch ? (
                    <Box style={{ height: `calc(${numSlides * 100}%)` }}>
                        <Box
                            centerContent
                            style={{ minHeight: 'var(--sizebox-height)' }}
                            top="none"
                            position="sticky"
                        >
                            <UploadImageField isActive hideErrors={!hasSubmitted} {...form} />
                        </Box>
                    </Box>
                ) : (
                    <Box centerContent>
                        <UploadImageField isActive hideErrors={!hasSubmitted} {...form} />
                    </Box>
                )
            }
        >
            <MotionStack gap="sm" layout="position">
                <TextField
                    autoFocus={!isTouch}
                    background="level2"
                    placeholder="Town Name"
                    tone={
                        hasSubmitted && form.formState.errors.slideNameAndIcon?.spaceName
                            ? 'error'
                            : undefined
                    }
                    {...form.register('slideNameAndIcon.spaceName', {
                        onChange: (e) => {
                            if (errors.slideNameAndIcon?.spaceName) {
                                form.trigger('slideNameAndIcon.spaceName', {
                                    shouldFocus: true,
                                })
                            }
                        },
                    })}
                />
                {hasSubmitted && (
                    <ErrorMessage
                        preventSpace
                        errors={errors}
                        fieldName="slideNameAndIcon.spaceName"
                    />
                )}
            </MotionStack>
            <NextButton
                form={form}
                disabled={!!errors.slideNameAndIcon}
                onClickDisabled={() => {
                    setHasSubmitted(true)
                }}
                onNextSlide={() => {
                    form.trigger(['slideNameAndIcon'], { shouldFocus: true })
                    setHasSubmitted(true)
                    onNextSlide?.()
                }}
            />
        </SlideLayout>
    )
}

export const TownType = (props: SlideProps) => {
    const { form, onNextSlide, ...slideProps } = props
    const optionMap = {
        free: {
            name: 'Free',
            description: (
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
            ),
        },
        paid: { name: 'Paid', description: 'Members must pay to join' },
    }
    return (
        <SlideLayout title="Town Type" {...slideProps}>
            <RadioSelect
                applyChildProps={() => form.register('clientTownType')}
                options={clientTownTypeOptions}
                render={(o, selected, focused) => (
                    <RadioOption
                        selected={selected}
                        focused={focused}
                        data-testid={`option-towntype-${o}`}
                    >
                        <Stack gap="sm">
                            <Paragraph>{o === 'paid' ? 'Paid' : 'Free'}</Paragraph>
                            <Paragraph color="gray2" size="sm">
                                {optionMap[o].description}
                            </Paragraph>
                        </Stack>
                    </RadioOption>
                )}
                onChange={onNextSlide}
            />
        </SlideLayout>
    )
}

export const MembershipFees = (props: SlideProps) => {
    const { form, onNextSlide, ...slideProps } = props
    const { isTouch } = useDevice()
    const [hasSubmitted, setHasSubmitted] = useState(false)

    const optionMap = {
        fixed: {
            name: 'Fixed',
            description: 'Members must pay a price to join',
        },
        dynamic: {
            name: 'Dynamic',
            description:
                'Membership fees logarithmically increases from $1 - $100 as town demand increases',
        },
    }

    const { errors } = form.formState

    const hasOptions = form.watch('slideMembership.clientMembershipFee') === 'fixed'

    const onChange = useCallback(
        (e: ChangeEvent<HTMLSelectElement>) => {
            form.trigger(['slideMembership'])
            if (form.getValues('slideMembership.clientMembershipFee') !== 'fixed') {
                onNextSlide?.()
            }
        },
        [form, onNextSlide],
    )

    return (
        <SlideLayout title="Membership Fees" {...slideProps}>
            <RadioSelect
                applyChildProps={() => form.register('slideMembership.clientMembershipFee')}
                options={clientMembershipFeeOptions}
                render={(o, selected, focused) => (
                    <RadioOption
                        selected={selected}
                        focused={focused}
                        data-testid={`option-fee-${o}`}
                    >
                        <Stack gap="sm">
                            <Paragraph>{optionMap[o].name}</Paragraph>
                            <Paragraph color="gray2" size="sm">
                                {optionMap[o].description}
                            </Paragraph>
                        </Stack>
                        {o === 'fixed' && (
                            <AnimatePresence mode="popLayout">
                                {selected && (
                                    <FadeInBox gap="sm">
                                        <TextField
                                            autoFocus={!isTouch && slideProps.isCurrentSlide}
                                            background="level2"
                                            placeholder="Enter amount"
                                            after="ETH"
                                            tone={
                                                hasSubmitted && errors.slideMembership
                                                    ? 'error'
                                                    : undefined
                                            }
                                            {...form.register('slideMembership.membershipCost', {
                                                onChange: (e) => {
                                                    if (e.target.value > 0) {
                                                        setHasSubmitted(true)
                                                    }
                                                },
                                                onBlur: (e) => {
                                                    setHasSubmitted(true)
                                                },
                                            })}
                                        />
                                        {hasSubmitted && (
                                            <ErrorMessage
                                                errors={errors}
                                                fieldName="slideMembership.membershipCost"
                                            />
                                        )}
                                    </FadeInBox>
                                )}
                            </AnimatePresence>
                        )}
                    </RadioOption>
                )}
                onChange={onChange}
            />
            {GATING_ENABLED && hasOptions && (
                <NextButton
                    form={form}
                    disabled={!!errors.slideMembership}
                    onClickDisabled={() => {
                        setHasSubmitted(true)
                    }}
                    onNextSlide={() => {
                        setHasSubmitted(true)
                        onNextSlide?.()
                    }}
                />
            )}
        </SlideLayout>
    )
}

export const WhoCanJoin = (props: SlideProps) => {
    const { form, onNextSlide, ...slideProps } = props
    const optionMap = {
        anyone: { name: 'Anyone', description: 'Anyone can join' },
        gated: { name: 'Gated', description: 'Only invited users can join' },
    }

    const onChange = useCallback(() => {
        form.trigger()
        onNextSlide?.()
    }, [form, onNextSlide])

    return (
        <SlideLayout title="Who can join your town?" {...slideProps}>
            <RadioSelect
                applyChildProps={() => form.register('clientCanJoin')}
                options={clientCanJoinOptions}
                render={(o, selected, focused) => (
                    <RadioOption
                        selected={selected}
                        focused={focused}
                        data-testid={`option-canjoin-${o}`}
                    >
                        <Stack gap="sm">
                            <Paragraph>{optionMap[o].name}</Paragraph>
                            <Paragraph color="gray2" size="sm">
                                {optionMap[o].description}
                            </Paragraph>
                        </Stack>
                    </RadioOption>
                )}
                onChange={onChange}
            />
        </SlideLayout>
    )
}

export const GateBy = (props: SlideProps) => {
    const { form, onNextSlide, ...slideProps } = props
    const optionMap = {
        digitalAssets: {
            name: 'Digital Assets',
            description: 'Gate by token ownership',
        },
        walletAddress: {
            name: 'Wallet Addresses',
            description: 'Gate by specific wallet addresses',
        },
    }

    const onChange = useCallback(() => {
        form.trigger()
        onNextSlide?.()
    }, [form, onNextSlide])

    return (
        <SlideLayout title="Gate by" {...slideProps}>
            <RadioSelect
                gap
                applyChildProps={() => form.register('clientGateBy')}
                options={clientGateByOptions}
                name="gatingType"
                render={(o, selected, focused) => (
                    <RadioOption selected={selected} focused={focused}>
                        <Stack gap="sm">
                            <Paragraph>{optionMap[o].name}</Paragraph>
                            <Paragraph color="gray2" size="sm">
                                {optionMap[o].description}
                            </Paragraph>
                        </Stack>
                    </RadioOption>
                )}
                onChange={onChange}
            />
        </SlideLayout>
    )
}

export const GateByDigitalAssets = ({ form, ...slideProps }: SlideProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const { getValues, setValue, trigger } = form
    const onSelectedTokensChange = (tokens: Token[]) => {
        setValue('tokensGatedBy', tokens)
        trigger(['tokensGatedBy'])
    }
    const onEthBalanceChange = (ethBalance: string) => {
        setValue('ethBalanceGatedBy', ethBalance)
        trigger(['ethBalanceGatedBy'])
    }
    useEffect(() => {
        return () => {
            setValue('tokensGatedBy', [])
            setValue('ethBalanceGatedBy', '')
        }
    }, [setValue])

    return (
        <SlideLayout title="Choose Digital Assets" {...slideProps}>
            <MotionBox layout="position">
                <TokenSelector
                    isValidationError={form.formState.errors.tokensGatedBy !== undefined}
                    inputRef={inputRef}
                    ethBalance={getValues('ethBalanceGatedBy')}
                    tokens={getValues('tokensGatedBy')}
                    onChange={onSelectedTokensChange}
                    onEthBalanceChange={onEthBalanceChange}
                />
            </MotionBox>
        </SlideLayout>
    )
}

export const GateByWalletAddress = (props: SlideProps) => {
    const { form, ...slideProps } = props
    const { formState } = form
    const { trigger, setValue } = form
    const onChange = useCallback(
        (usersGatedBy: Address[]) => {
            setValue('usersGatedBy', usersGatedBy)
            trigger(['usersGatedBy'])
        },
        [trigger, setValue],
    )
    useEffect(() => {
        return () => {
            setValue('usersGatedBy', [])
        }
    }, [setValue])
    return (
        <SlideLayout title="Choose Wallet Addresses" {...slideProps}>
            <MotionBox layout="position">
                <WalletMemberSelector
                    background="level2"
                    isRole={false}
                    walletMembers={form.getValues('usersGatedBy') as Address[]}
                    isValidationError={
                        formState.errors.usersGatedBy !== undefined &&
                        !!formState.touchedFields.usersGatedBy
                    }
                    onChange={onChange}
                />
            </MotionBox>
        </SlideLayout>
    )
}

export const CreateTownAnimation = (props: SlideProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { form, onNextSlide, ...slideProps } = props
    return (
        <SlideLayout {...slideProps}>
            <SlideLayout />
        </SlideLayout>
    )
}
