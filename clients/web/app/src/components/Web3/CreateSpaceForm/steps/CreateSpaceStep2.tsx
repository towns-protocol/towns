import React, { useRef } from 'react'
import * as z from 'zod'
import { UseFormReturn } from 'react-hook-form'
import { Box, ErrorMessage, FormRender, Stack, Text, TextField } from '@ui'
import { useCachedTokensForWallet } from 'api/lib/tokenContracts'
import { useAuth } from 'hooks/useAuth'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { TokenAvatar } from '../../../Tokens/TokenAvatar'
import { CreateSpaceFormState } from '../types'
import { SPACE_NAME } from '../constants'

const MAX_LENGTH = 32

const schema = z.object({
    [SPACE_NAME]: z
        .string({
            errorMap: (err, ctx) => {
                if (ctx.data === null) {
                    return { message: 'Town name is required.' }
                }

                if (ctx.data?.length === 0 || err.code === 'too_small') {
                    return { message: 'Town name must be at least 2 characters.' }
                }
                if (err.code === 'too_big') {
                    return { message: 'Town name must be less than 32 characters.' }
                }

                return {
                    message:
                        'Town name can only contain lowercase letters, numbers, spaces, hyphens, periods and underscores.',
                }
            },
        })
        .regex(/^[a-z0-9 ._-]+$/)
        .min(2)
        .max(MAX_LENGTH),
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
    const hasReached2Chars = useRef(false)

    const { loggedInWalletAddress: wallet } = useAuth()

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
            {({ formState, setError, register, clearErrors, watch, setValue, getValues }) => {
                const spaceNameValue = watch(SPACE_NAME)

                if (!hasReached2Chars.current && spaceNameValue?.length > 1) {
                    hasReached2Chars.current = true
                }

                const showSpaceNameError = () => {
                    const spaceNameError = formState.errors[SPACE_NAME]
                    if (spaceNameError?.type !== 'too_small') {
                        return true
                    }
                    // only show the too_small error if the user has typed more than 2 characters
                    return hasReached2Chars.current
                }

                return (
                    <>
                        <Stack gap="sm" paddingY="lg" data-testid="space-form-name-field">
                            <TextField
                                maxLength={MAX_LENGTH}
                                background="level2"
                                label="Town Name"
                                placeholder="Town Name"
                                {...register(SPACE_NAME)}
                            />
                            {formState.errors[SPACE_NAME] && showSpaceNameError() && (
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
