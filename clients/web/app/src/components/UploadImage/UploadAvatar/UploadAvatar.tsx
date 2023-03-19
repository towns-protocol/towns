import React, { ChangeEvent, useMemo } from 'react'
import { FieldValues, UseFormRegister, UseFormReturn } from 'react-hook-form'
import { createUserIdFromString } from 'use-zion-client'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'

import { Box } from 'ui/components/Box/Box'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { UploadInput } from 'ui/components/Form/Upload'
import { ErrorMessage, Icon, Text } from '@ui'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { useUploadImage } from 'api/lib/uploadImage'
import { atoms } from 'ui/styles/atoms.css'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useImageSource } from '../useImageSource'
import { avatarHoverStyles, avatarIsLoadingStyles } from './UploadAvatar.css'

async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = src
    })
}

const MIN_DIMENSION = 400
const MAX_SIZE = 5000000

type Props = {
    userId: string
} & Partial<
    UseFormReturn<{
        walletAddress: string
        displayName: string
        profilePic: FileList | undefined
    }>
>

const formFieldName = 'profilePic'

export const UploadAvatar = (props: Props) => {
    const { setError, register, clearErrors, userId, formState } = props
    const ref = React.useRef<HTMLInputElement>(null)

    const resourceId = useMemo(() => {
        return createUserIdFromString(userId ?? '')?.accountAddress ?? ''
    }, [userId])

    const { mutate: upload, isLoading } = useUploadImage(resourceId)

    const { onLoad, onError, imageError, imageSrc } = useImageSource(resourceId, 'thumbnail100')

    async function onChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files.length > 0) {
            const url = URL.createObjectURL(files[0])
            const { width, height } = await getImageDimensions(url)
            clearErrors?.([formFieldName])

            if (files[0].size > MAX_SIZE) {
                setError?.(formFieldName, {
                    message: 'Upload an image less than 5MB',
                })
                return
            }

            if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
                setError?.(formFieldName, {
                    message: `Image is too small. Please upload an image with a minimum height & width of ${MIN_DIMENSION}px.`,
                })
                return
            }

            upload(
                { id: resourceId, file: files[0], imageUrl: url, type: 'avatar' },
                {
                    onError: () => {
                        setError?.(formFieldName, {
                            message: 'There was an error uploading your image. Please try again.',
                        })
                    },
                },
            )
        }
    }

    function onClick() {
        ref.current?.click()
    }

    const styles = useMemo(() => {
        if (!imageError && isLoading) {
            return avatarIsLoadingStyles
        }
        return imageError ? '' : avatarHoverStyles
    }, [imageError, isLoading])

    return (
        <Box position="relative" data-testid="upload-image-container">
            <>
                <Box
                    position="relative"
                    rounded="full"
                    overflow="hidden"
                    className={atoms({
                        width: 'x8',
                        height: 'x8',
                    })}
                >
                    <Box
                        key={imageSrc}
                        position="relative"
                        cursor="pointer"
                        role="button"
                        background="level2"
                        justifyContent="center"
                        alignItems="center"
                        width="100%"
                        height="100%"
                        rounded="sm"
                        onClick={onClick}
                    >
                        <Box absoluteFill>
                            {
                                <img
                                    src={imageSrc}
                                    style={{
                                        opacity: imageError ? 0 : 1,
                                    }}
                                    onLoad={onLoad}
                                    onError={onError}
                                />
                            }
                        </Box>
                        <Box absoluteFill centerContent className={styles}>
                            {isLoading ? (
                                <ButtonSpinner />
                            ) : (
                                <Icon type="camera" size="square_sm" />
                            )}
                        </Box>

                        <Text className={srOnlyClass}>Select avatar</Text>
                    </Box>

                    <UploadInput
                        name={formFieldName}
                        className={[fieldStyles.field, srOnlyClass]}
                        ref={ref}
                        // TODO: fix this typing
                        register={register as unknown as UseFormRegister<FieldValues>}
                        accept="image/*"
                        onChange={onChange}
                    />
                    <FieldOutline tone="accent" rounded="sm" />
                </Box>
                {formState?.errors[formFieldName] && (
                    <Box padding width="100%">
                        <ErrorMessage errors={formState.errors} fieldName={formFieldName} />
                    </Box>
                )}
            </>
        </Box>
    )
}
