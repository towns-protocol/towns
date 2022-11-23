import React from 'react'
import * as z from 'zod'
import { Box, ErrorMessage, FormRender, RadioCard } from '@ui'
import { CreateSpaceFormState, useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { TokenList } from './TokenList'

const membershipTypeErrorMessage = 'Please choose who can join your space.'
const schema = z
    .object({
        membershipType: z
            .string({
                invalid_type_error: membershipTypeErrorMessage, // b/c initially undefined for string
                required_error: membershipTypeErrorMessage,
            })
            .min(1),
        tokens: z.array(z.string()),
    })
    .superRefine((data, ctx) => {
        if (data.membershipType === 'tokenHolders') {
            if (data.tokens?.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['tokens'],
                    message: 'Select at least one token',
                })
            }
        }
    })

export const CreateSpaceStep1 = ({ onSubmit, id }: FormStepProps) => {
    const EVERYONE = 'everyone'
    const TOKEN_HOLDERS = 'tokenHolders'
    const defaultState = useCreateSpaceFormStore((state) => state.step1)
    const setStep1 = useCreateSpaceFormStore((state) => state.setStep1)

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
                const isTokenHolders = formProps.watch('membershipType') === TOKEN_HOLDERS
                const isValid = !Object.values(formProps.formState.errors).length

                return (
                    <>
                        <Box paddingY="sm">
                            <RadioCard
                                name="membershipType"
                                value={EVERYONE}
                                title="Everyone"
                                description="Anyone with the space link may join your space"
                                onClick={() => {
                                    formProps.setValue('membershipType', EVERYONE, {
                                        shouldValidate: true,
                                    })
                                    formProps.setValue('tokens', [], {
                                        shouldValidate: true,
                                    })
                                }}
                                {...formProps}
                            />
                        </Box>

                        <RadioCard
                            name="membershipType"
                            value={TOKEN_HOLDERS}
                            title="Token holders"
                            description="People who hold a specific token may join your space"
                            onClick={() =>
                                formProps.setValue('membershipType', TOKEN_HOLDERS, {
                                    shouldValidate: true,
                                })
                            }
                            {...formProps}
                        >
                            {() => {
                                return <TokenList isChecked={isTokenHolders} {...formProps} />
                            }}
                        </RadioCard>

                        {isValid ? null : (
                            <Box padding="sm">
                                <ErrorMessage
                                    errors={formProps.formState.errors}
                                    fieldName="membershipType"
                                />

                                <ErrorMessage
                                    errors={formProps.formState.errors}
                                    fieldName="tokens"
                                />
                            </Box>
                        )}
                    </>
                )
            }}
        </FormRender>
    )
}
