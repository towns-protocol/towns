import React from 'react'
import * as z from 'zod'
import { UseFormReturn } from 'react-hook-form'
import { useWeb3Context } from 'use-zion-client'
import { Box, ErrorMessage, FormRender, Stack, Text, TextField } from '@ui'
import { useCachedTokensForWallet } from 'api/lib/tokenContracts'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { TokenAvatar } from '../../../Tokens/TokenAvatar'
import { CreateSpaceFormState } from '../types'
import { SPACE_NAME } from '../constants'

const spaceNameRequiredMessasge = 'Please enter a name for your space.'

const schema = z.object({
    [SPACE_NAME]: z
        .string({
            invalid_type_error: spaceNameRequiredMessasge,
            required_error: spaceNameRequiredMessasge,
        })
        .min(1),
})

const TokenList = (props: Partial<UseFormReturn>) => {
    const { setError, clearErrors } = props
    const tokens = useCreateSpaceFormStore((state) => state.step1.tokens)
    const toggleToken = useCreateSpaceFormStore((state) => state.toggleToken)
    const cachedTokensForWallet = useCachedTokensForWallet()
    function handleClick(contractAddress: string, e: React.MouseEvent) {
        e.preventDefault()

        if (tokens.length === 1) {
            setError?.('tokens', {
                type: 'required',
                message: `You can't remove the last token. If you would like to include everyone, please go to previous step.`,
            })
            setTimeout(() => clearErrors?.(['tokens']), 3000)
            return
        }
        toggleToken(contractAddress)
    }

    return (
        <>
            <Box paddingTop="lg" paddingBottom="sm">
                <Text strong>Members</Text>
            </Box>
            {!tokens.length ? (
                <Box paddingY="sm">
                    <Text>Everyone </Text>
                </Box>
            ) : (
                <Box
                    display="flex"
                    flexDirection="row"
                    gap="md"
                    paddingY="md"
                    data-testid="step-2-avatars"
                >
                    {tokens.map((contractAddress: string) => {
                        const token = cachedTokensForWallet.tokens.find(
                            (t) => t.contractAddress === contractAddress,
                        )
                        return (
                            <TokenAvatar
                                size="avatar_md"
                                key={contractAddress}
                                imgSrc={token?.imgSrc || ''}
                                label={token?.label || ''}
                                contractAddress={contractAddress}
                                onClick={handleClick}
                            />
                        )
                    })}
                </Box>
            )}
        </>
    )
}

export const CreateSpaceStep2 = ({ onSubmit, id }: FormStepProps) => {
    const defaultState = useCreateSpaceFormStore((state) => state.step2)
    const setStep2 = useCreateSpaceFormStore((state) => state.setStep2)

    const { accounts } = useWeb3Context()
    const wallet = accounts[0]

    return (
        <FormRender<CreateSpaceFormState['step2']>
            id={id}
            defaultValues={defaultState}
            mode="onChange"
            schema={schema}
            onSubmit={(data) => {
                setStep2(data)
                onSubmit()
            }}
        >
            {({ formState, setError, register, clearErrors, watch, setValue }) => {
                return (
                    <>
                        <Stack gap="sm" paddingY="lg" data-testid="space-form-name-field">
                            <TextField
                                background="level2"
                                label="Space Name"
                                placeholder="Space Name"
                                {...register(SPACE_NAME)}
                            />
                            {formState.errors[SPACE_NAME] && (
                                <ErrorMessage errors={formState.errors} fieldName={SPACE_NAME} />
                            )}
                        </Stack>

                        <Stack gap="md" paddingBottom="sm">
                            <Box>
                                <Text strong>Owner</Text>
                            </Box>
                            <Box>
                                <Text>{wallet}</Text>
                            </Box>
                        </Stack>

                        <TokenList setError={setError} clearErrors={clearErrors} />
                        {formState.errors.tokens && (
                            <ErrorMessage errors={formState.errors} fieldName="tokens" />
                        )}
                    </>
                )
            }}
        </FormRender>
    )
}
