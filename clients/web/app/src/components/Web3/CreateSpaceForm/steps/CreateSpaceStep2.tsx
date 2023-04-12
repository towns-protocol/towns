import React, { useCallback, useRef } from 'react'
import * as z from 'zod'
import { UseFormReturn } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, ErrorMessage, FormRender, Heading, Paragraph, Stack, Text, TextField } from '@ui'
import { useCachedTokensForWallet } from 'api/lib/tokenContracts'
import { useAuth } from 'hooks/useAuth'
import { FadeInBox } from '@components/Transitions'
import { SmallUploadImageTemplate } from '@components/UploadImage/SmallUploadImageTemplate'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { FormStepProps } from '../../../../hooks/useFormSteps'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { TokenAvatar } from '../../../Tokens/TokenAvatar'
import { CreateSpaceFormState } from '../types'
import { SPACE_NAME, TEMPORARY_SPACE_ICON_URL } from '../constants'

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
                    message: 'Town name must be between 2 and 32 characters.',
                }
            },
        })
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

    return !tokens.length ? (
        <Paragraph color="gray1">Everyone</Paragraph>
    ) : (
        <Box display="flex" flexDirection="row" gap="md" data-testid="step-2-avatars">
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
    )
}

export const CreateSpaceStep2 = ({ onSubmit, id }: FormStepProps) => {
    const defaultState = useCreateSpaceFormStore((state) => state.step2)
    const setStep2 = useCreateSpaceFormStore((state) => state.setStep2)
    const hasReached2Chars = useRef(false)

    const { loggedInWalletAddress: wallet } = useAuth()

    const onUpload = useCallback(
        ({ imageUrl, file, id }: Omit<UploadImageRequestConfig, 'type'>) => {
            // set resource on image store so the image updates in the upload component
            const { setLoadedResource } = useImageStore.getState()
            setLoadedResource(id, {
                imageUrl,
            })
            // also save to space form store so that the image can actually be uploaded later after space is minted
            useCreateSpaceFormStore.getState().setImageData({ imageUrl, file })
        },
        [],
    )

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
                    <Stack gap="x4">
                        <AnimatePresence>
                            <Stack gap="sm" data-testid="space-form-name-field" key="field">
                                <TextField
                                    maxLength={MAX_LENGTH}
                                    background="level2"
                                    label="Town Name"
                                    placeholder="Town Name"
                                    autoComplete="off"
                                    tone={
                                        formState.errors[SPACE_NAME] && showSpaceNameError()
                                            ? 'error'
                                            : undefined
                                    }
                                    {...register(SPACE_NAME)}
                                />

                                {formState.errors[SPACE_NAME] && showSpaceNameError() && (
                                    <FadeInBox key="error">
                                        <ErrorMessage
                                            errors={formState.errors}
                                            fieldName={SPACE_NAME}
                                        />
                                    </FadeInBox>
                                )}
                            </Stack>
                            <Stack gap="md" data-testid="space-icon" key="icon">
                                <Text strong>Town Icon</Text>

                                <SmallUploadImageTemplate
                                    canEdit
                                    overrideUploadCb={onUpload}
                                    type="avatar"
                                    formFieldName="profilePic"
                                    resourceId={TEMPORARY_SPACE_ICON_URL}
                                    setError={setError}
                                    register={register}
                                    formState={formState}
                                    clearErrors={clearErrors}
                                    rounded="sm"
                                    imageRestrictions={{
                                        minDimension: {
                                            message: `Image is too small. Please upload an image with a minimum height & width of 300px.`,
                                            min: 300,
                                        },
                                    }}
                                />
                            </Stack>

                            <MotionBox layout="position" gap="x4">
                                <Stack>
                                    <Paragraph strong>Owner</Paragraph>
                                    <Paragraph color="gray1">{wallet}</Paragraph>
                                </Stack>

                                <Stack gap>
                                    <Heading level={4}>Members</Heading>
                                    <TokenList setError={setError} clearErrors={clearErrors} />
                                    {formState.errors.tokens && (
                                        <ErrorMessage
                                            errors={formState.errors}
                                            fieldName="tokens"
                                        />
                                    )}
                                </Stack>
                            </MotionBox>
                        </AnimatePresence>
                    </Stack>
                )
            }}
        </FormRender>
    )
}

const MotionBox = motion(Box)
