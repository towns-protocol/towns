import React from 'react'
import * as z from 'zod'
import { useWeb3Context, useZionClient } from 'use-zion-client'
import { Box, ErrorMessage, FormRender, Heading, RadioCard } from '@ui'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { TokenList } from '../../../Tokens/TokenList'
import { CreateSpaceFormState } from '../types'
import { EVERYONE, MEMBERSHIP_TYPE, TOKENS, TOKEN_HOLDERS } from '../constants'

const membershipTypeErrorMessage = 'Please choose who can join your space.'

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
    const { chainId } = useZionClient()
    const { accounts } = useWeb3Context()
    const wallet = accounts[0]

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
                    <>
                        <Box paddingTop="lg" paddingBottom="md">
                            <Heading level={3}> Who can join your space? </Heading>
                        </Box>
                        <Box paddingY="sm">
                            <RadioCard
                                name={MEMBERSHIP_TYPE}
                                value={EVERYONE}
                                title="Everyone"
                                description="Anyone with the space link may join your space"
                                onClick={() => {
                                    formProps.setValue(MEMBERSHIP_TYPE, EVERYONE, {
                                        shouldValidate: true,
                                    })
                                    formProps.setValue(TOKENS, [], {
                                        shouldValidate: true,
                                    })
                                }}
                                {...formProps}
                            />
                        </Box>

                        <RadioCard
                            name={MEMBERSHIP_TYPE}
                            value={TOKEN_HOLDERS}
                            title="Token holders"
                            description="People who hold a specific token may join your space"
                            onClick={() =>
                                formProps.setValue(MEMBERSHIP_TYPE, TOKEN_HOLDERS, {
                                    shouldValidate: true,
                                })
                            }
                            {...formProps}
                        >
                            {() => {
                                return (
                                    <TokenList
                                        wallet={wallet}
                                        chainId={chainId}
                                        isChecked={isTokenHolders}
                                        {...formProps}
                                    />
                                )
                            }}
                        </RadioCard>

                        {isValid ? null : (
                            <Box padding="sm">
                                <ErrorMessage
                                    errors={formProps.formState.errors}
                                    fieldName={MEMBERSHIP_TYPE}
                                />

                                <ErrorMessage
                                    errors={formProps.formState.errors}
                                    fieldName={TOKENS}
                                />
                            </Box>
                        )}
                    </>
                )
            }}
        </FormRender>
    )
}
