import React, { ChangeEvent, PropsWithChildren, useCallback, useMemo } from 'react'
import { UseFormReturn, useFormContext } from 'react-hook-form'
import { AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import { getContractsInfo } from 'use-zion-client'
import {
    Box,
    Dropdown,
    ErrorMessage,
    IconButton,
    MotionBox,
    RadioCard,
    Stack,
    Text,
    TextField,
} from '@ui'
import { TokensList } from '@components/Tokens'
import { FadeInBox } from '@components/Transitions'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { useAuth } from 'hooks/useAuth'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { env } from 'utils'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { shortAddress } from 'ui/utils/utils'
import { CreateSpaceFormV2SchemaType, membershipCostError } from './CreateSpaceFormV2.schema'
import { PanelContentProps, PanelType } from './types'

export function PanelContent({ onClick, panelType }: PanelContentProps) {
    const title = useMemo(() => {
        switch (panelType) {
            case PanelType.gating:
                return 'Who can join?'
            case PanelType.pricing:
                return 'Edit Pricing'
            default:
                return ''
        }
    }, [panelType])

    const renderContent = useCallback(() => {
        switch (panelType) {
            case PanelType.gating:
                return <GatingContent />
            case PanelType.pricing:
                return <PricingContent />
            default:
                return ''
        }
    }, [panelType])

    return (
        <Stack>
            <Stack
                horizontal
                justifyContent="spaceBetween"
                alignItems="center"
                height="x8"
                background="level2"
                padding="lg"
                borderBottom="level3"
            >
                <Text color="gray2">{title}</Text>
                <IconButton icon="close" color="default" onClick={onClick} />
            </Stack>
            <Stack padding="lg">{renderContent()}</Stack>
        </Stack>
    )
}

function GatingContent() {
    const { loggedInWalletAddress: wallet } = useAuth()
    const formProps = useFormContext<CreateSpaceFormV2SchemaType>()
    const isTokenHolders = formProps.watch('membershipType') === 'tokenHolders'
    const isValid = !Object.values(formProps.formState.errors).length

    const onEveryoneClick = useCallback((formProps: UseFormReturn<CreateSpaceFormV2SchemaType>) => {
        formProps.setValue('membershipType', 'everyone', {
            shouldValidate: true,
        })
        formProps.setValue('tokensGatingMembership', [], {
            shouldValidate: true,
        })
    }, [])

    const onTokensCardClick = useCallback(
        (formProps: UseFormReturn<CreateSpaceFormV2SchemaType>) => {
            formProps.setValue('membershipType', 'tokenHolders', {
                shouldValidate: true,
            })
        },
        [],
    )

    const onSelectedTokensUpdate = useCallback(
        (
            tokens: TokenDataStruct[],
            setValue: UseFormReturn<CreateSpaceFormV2SchemaType>['setValue'],
        ) => {
            setValue?.('tokensGatingMembership', tokens, {
                shouldValidate: true,
            })
        },
        [],
    )

    const chainId = useEnvironment().chainId

    if (!wallet) {
        return null
    }

    return (
        <Stack gap="sm">
            <Box>
                <RadioCard
                    name="membershipType"
                    value="everyone"
                    title="Everyone"
                    description="Anyone with the town link may join your town"
                    onClick={() => onEveryoneClick(formProps)}
                    {...formProps}
                />
            </Box>

            {wallet && (
                <RadioCard
                    name="membershipType"
                    value="tokenHolders"
                    title="Token holders"
                    description="Users must hold ALL of the following tokens to join your town"
                    onClick={() => onTokensCardClick(formProps)}
                    {...formProps}
                >
                    {() => {
                        return (
                            <>
                                {env.DEV && chainId === 31337 && (
                                    <ClipboardCopy
                                        label={`Mock NFT ${shortAddress(
                                            getContractsInfo(31337).mockErc721aAddress,
                                        )} (local wallet linking)`}
                                        clipboardContent={
                                            getContractsInfo(31337).mockErc721aAddress
                                        }
                                    />
                                )}
                                <TokensList
                                    wallet={wallet}
                                    showTokenList={isTokenHolders}
                                    initialItems={formProps.getValues('tokensGatingMembership')}
                                    onUpdate={(tokens) =>
                                        onSelectedTokensUpdate(tokens, formProps.setValue)
                                    }
                                />
                            </>
                        )
                    }}
                </RadioCard>
            )}
            <MotionBox layout="position">
                <AnimatePresence>
                    {isValid ? null : (
                        <FadeInBox key="error">
                            <ErrorMessage
                                errors={formProps.formState.errors}
                                fieldName="membershipType"
                            />

                            <ErrorMessage
                                errors={formProps.formState.errors}
                                fieldName="tokensGatingMembership"
                            />
                        </FadeInBox>
                    )}
                </AnimatePresence>
            </MotionBox>
        </Stack>
    )
}

function PricingContent() {
    const { formState, register, setValue, watch, setError, clearErrors } =
        useFormContext<CreateSpaceFormV2SchemaType>()

    const [price] = watch(['membershipCost', 'membershipLimit'])

    const onCostChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target

            if (isNaN(Number(value))) {
                setError('membershipCost', {
                    message: 'Please enter a valid number',
                })
                return
            }

            if (value.includes('.')) {
                const priceHasDecimalAlready = price.toString().includes('.')
                const [, decimal] = value.split('.')

                // user deleted the only decimal number
                if (!decimal && priceHasDecimalAlready) {
                    // strip the "." from the value and set to integer
                    setValue('membershipCost', Number(value), {
                        shouldValidate: true,
                    })
                    return
                }
                // user added decimal but hasn't enterd any numbers after it
                if (!decimal) {
                    return
                }
            }

            setValue('membershipCost', Number(value), {
                shouldValidate: true,
            })
        },
        [setValue, setError, price],
    )

    const onLimitChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target

            if (isNaN(Number(value))) {
                setError('membershipLimit', {
                    message: 'Please enter a valid number',
                })
                return
            }

            // for some reason the superRefine in the schema does not fire
            // when this field changes and these invalid conditions are met,
            // so adding an error in this case
            const _limit = Number(value)

            if (!isNaN(+price)) {
                if (+price < 1 && _limit > 1000) {
                    setError('membershipCost', {
                        message: membershipCostError,
                    })
                } else {
                    clearErrors('membershipCost')
                }
            }

            setValue('membershipLimit', _limit, {
                shouldValidate: true,
            })
        },
        [price, setValue, setError, clearErrors],
    )

    return (
        <Stack gap background="level2" rounded="md" padding="md">
            <PricingRow label="Cost">
                <Stack gap="sm">
                    <Stack horizontal alignSelf="end" width="200" gap="xs">
                        <TextField
                            background="level3"
                            width="x4"
                            {...register('membershipCost', {
                                // setValueAs: (value) => Number(value),
                            })}
                            onChange={onCostChange}
                        />

                        <Dropdown
                            background="level3"
                            // TODO
                            options={[
                                {
                                    label: 'ETH',
                                    value: ethers.constants.AddressZero,
                                },
                            ]}
                        />
                    </Stack>
                    {formState.errors['membershipCost'] && (
                        <FadeInBox key="error">
                            <ErrorMessage errors={formState.errors} fieldName="membershipCost" />
                        </FadeInBox>
                    )}
                </Stack>
            </PricingRow>
            <PricingRow label="Supply">
                <Stack gap="sm">
                    <Stack horizontal width="x8" gap="xs" alignSelf="end">
                        <TextField
                            background="level3"
                            width="x8"
                            {...register('membershipLimit', {
                                // setValueAs: (value) => Number(value),
                            })}
                            onChange={onLimitChange}
                        />
                    </Stack>
                    {formState.errors['membershipLimit'] && (
                        <FadeInBox key="error">
                            <ErrorMessage errors={formState.errors} fieldName="membershipLimit" />
                        </FadeInBox>
                    )}
                </Stack>
            </PricingRow>
            {/* TODO: contract updates pending */}
            {/* <PricingRow label="valid">
                <Stack horizontal width="200" gap="xs">
                    <Dropdown
                        background="level3"
                        options={[
                            {
                                label: 'a',
                                value: 'a',
                            },
                            {
                                label: 'b',
                                value: 'b',
                            },
                        ]}
                    />
                </Stack>
            </PricingRow>
            <PricingRow label="gas">
                <Stack horizontal width="200" gap="xs">
                    <Dropdown
                        background="level3"
                        options={[
                            {
                                label: 'a',
                                value: 'a',
                            },
                            {
                                label: 'b',
                                value: 'b',
                            },
                        ]}
                    />
                </Stack>
            </PricingRow> */}
        </Stack>
    )
}

function PricingRow({ children, label }: PropsWithChildren<{ label: string }>) {
    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="center">
            <Stack grow>{label}</Stack>
            {children}
        </Stack>
    )
}
