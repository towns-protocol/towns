import React, { useCallback } from 'react'
import * as z from 'zod'
import { UseFormReturn } from 'react-hook-form'
import { AnimatePresence } from 'framer-motion'
import { Box, ErrorMessage, FormRender, Heading, RadioCard, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { FadeInBox } from '@components/Transitions'
import { MotionBox } from '@components/Transitions/MotionBox'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { TokenList } from '../../../Tokens/TokenList'
import { CreateSpaceFormState } from '../types'
import { EVERYONE, MEMBERSHIP_TYPE, TOKENS, TOKEN_HOLDERS } from '../constants'

const membershipTypeErrorMessage = 'Please choose who can join your town.'

const schema = z
    .object({
        [MEMBERSHIP_TYPE]: z
            .string({
                invalid_type_error: membershipTypeErrorMessage, // b/c initially undefined for string
                required_error: membershipTypeErrorMessage,
            })
            .min(1),
        tokens: z.array(z.string()),
    })
    .superRefine((data, ctx) => {
        if (data[MEMBERSHIP_TYPE] === TOKEN_HOLDERS) {
            if (data[TOKENS]?.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [TOKENS],
                    message: 'Select at least one token',
                })
            }
        }
    })

export const CreateSpaceStep1 = ({ onSubmit, id }: FormStepProps) => {
    const defaultState = useCreateSpaceFormStore((state) => state.step1)
    const setStep1 = useCreateSpaceFormStore((state) => state.setStep1)
    const { loggedInWalletAddress: wallet } = useAuth()

    const onEveryoneClick = useCallback((formProps: UseFormReturn) => {
        formProps.setValue(MEMBERSHIP_TYPE, EVERYONE, {
            shouldValidate: true,
        })
        formProps.setValue(TOKENS, [], {
            shouldValidate: true,
        })
        useCreateSpaceFormStore.getState().clearTokens()
    }, [])

    const onTokensCardClick = useCallback((formProps: UseFormReturn) => {
        formProps.setValue(MEMBERSHIP_TYPE, TOKEN_HOLDERS, {
            shouldValidate: true,
        })
    }, [])

    const onSelectedTokensUpdate = useCallback(
        (tokens: string[], setValue: UseFormReturn['setValue']) => {
            // set form values (for validation)
            setValue?.(TOKENS, tokens, {
                shouldValidate: true,
            })
            // and set store
            useCreateSpaceFormStore.getState().setTokens(tokens)
        },
        [],
    )

    const storedTokens = useCreateSpaceFormStore((state) => state.step1.tokens)

    return (
        <FormRender<CreateSpaceFormState['step1']>
            id={id}
            defaultValues={defaultState}
            schema={schema}
            mode="onChange"
            onSubmit={(data) => {
                setStep1(data)
                onSubmit()
            }}
        >
            {(formProps) => {
                const isTokenHolders = formProps.watch(MEMBERSHIP_TYPE) === TOKEN_HOLDERS
                const isValid = !Object.values(formProps.formState.errors).length

                return (
                    <Stack gap="paragraph">
                        <Heading level={4}>Who can join your town?</Heading>
                        <Stack gap="sm">
                            <Box>
                                <RadioCard
                                    name={MEMBERSHIP_TYPE}
                                    value={EVERYONE}
                                    title="Everyone"
                                    description="Anyone with the town link may join your town"
                                    onClick={() => onEveryoneClick(formProps)}
                                    {...formProps}
                                />
                            </Box>

                            {wallet && (
                                <RadioCard
                                    name={MEMBERSHIP_TYPE}
                                    value={TOKEN_HOLDERS}
                                    title="Token holders"
                                    description="People who hold a specific token may join your town"
                                    onClick={() => onTokensCardClick(formProps)}
                                    {...formProps}
                                >
                                    {() => {
                                        return (
                                            <TokenList
                                                wallet={wallet}
                                                showTokenList={isTokenHolders}
                                                initialTokens={storedTokens}
                                                onUpdate={(tokens) =>
                                                    onSelectedTokensUpdate(
                                                        tokens,
                                                        formProps.setValue,
                                                    )
                                                }
                                            />
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
                                                fieldName={MEMBERSHIP_TYPE}
                                            />

                                            <ErrorMessage
                                                errors={formProps.formState.errors}
                                                fieldName={TOKENS}
                                            />
                                        </FadeInBox>
                                    )}
                                </AnimatePresence>
                            </MotionBox>
                        </Stack>
                    </Stack>
                )
            }}
        </FormRender>
    )
}
