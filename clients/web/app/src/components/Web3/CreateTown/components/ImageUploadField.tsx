import { Address, useImageStore } from 'use-towns-client'
import { useFormContext } from 'react-hook-form'
import React, { useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { UploadImageTemplateSize } from '@components/UploadImage/LargeUploadImageTemplate'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { UploadImageRequestConfig } from '@components/UploadImage/useOnImageChangeEvent'
import { UploadImageRenderer } from '@components/UploadImage/UploadImageRenderer'
import { isTouch } from 'hooks/useDevice'
import { Box, Icon, Paragraph } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { CreateTownFormSchema } from '../types'

type TransactionDetails = {
    isTransacting: boolean
    townAddress: Address | undefined
}

const DEFAULT_TRANSACTION_DETAILS: TransactionDetails = {
    isTransacting: false,
    townAddress: undefined,
}
export const UploadImageField = ({
    isActive,
    hideErrors,
    transactionDetails = DEFAULT_TRANSACTION_DETAILS,
    size,
}: {
    isActive: boolean
    hideErrors: boolean
    transactionDetails?: TransactionDetails
    size?: UploadImageTemplateSize
}) => {
    const { register, formState, setError, clearErrors, setValue, watch } =
        useFormContext<CreateTownFormSchema>()

    const rawImageSrc = watch('slideNameAndIcon.spaceIconUrl')
    const spaceName = watch('slideNameAndIcon.spaceName')
    // b/c it's a FileList before upload
    const imageSrc = typeof rawImageSrc === 'string' ? rawImageSrc : undefined
    const _isTouch = isTouch()

    const onUpload = useCallback(
        ({ imageUrl, file, id, type }: UploadImageRequestConfig) => {
            // set resource on image store so the image updates in the upload component
            const { setLoadedResource } = useImageStore.getState()
            setLoadedResource(id, { imageUrl })
            setValue('slideNameAndIcon.spaceIconUrl', imageUrl)
            setValue('slideNameAndIcon.spaceIconFile', file)
        },
        [setValue],
    )

    const avoidScrollbarsStyle = useMemo(() => ({ contain: 'layout' }), [])

    return (
        <Box style={avoidScrollbarsStyle}>
            {isActive ? (
                <UploadImageRenderer<CreateTownFormSchema>
                    canEdit={!transactionDetails.isTransacting}
                    type="spaceIcon"
                    formFieldName="slideNameAndIcon.spaceIconUrl"
                    dataTestId="create-town-image-upload-field"
                    resourceId={TEMPORARY_SPACE_ICON_URL}
                    setError={setError}
                    register={register}
                    formState={formState}
                    hideErrors={hideErrors}
                    imageRestrictions={{
                        // no limits on dimensions for spaces
                        minDimension: {
                            message: '',
                            min: 0,
                        },
                    }}
                    clearErrors={clearErrors}
                    onUploadImage={onUpload}
                    onFileAdded={() => {
                        clearErrors(['slideNameAndIcon.spaceIconFile'])
                    }}
                >
                    {({ isUploading, onClick, inputField }) => {
                        const error =
                            !hideErrors &&
                            (formState.errors.slideNameAndIcon?.spaceIconUrl ||
                                formState.errors.slideNameAndIcon?.spaceIconFile)

                        const color = error ? 'negative' : 'gray2'

                        return (
                            <Box>
                                <InteractiveTownsToken
                                    mintMode
                                    reduceMotion
                                    size={size === 'sm' ? 'sm' : _isTouch ? 'md' : 'xl'}
                                    address={transactionDetails.townAddress}
                                    imageSrc={imageSrc ?? undefined}
                                    color={color}
                                    onClick={() => {
                                        onClick()
                                    }}
                                >
                                    <Box
                                        padding="sm"
                                        color={color}
                                        style={{ border: '2px solid' }}
                                        borderRadius="full"
                                    >
                                        <Icon type="camera" size="square_md" color={color} />
                                    </Box>
                                </InteractiveTownsToken>
                                <Box position="absolute">{inputField}</Box>
                                <AnimatePresence>
                                    {error ? (
                                        <FadeInBox
                                            grow
                                            paddingTop="lg"
                                            position="absolute"
                                            bottom="-x4"
                                            width="100%"
                                        >
                                            <Paragraph size="sm" color={color} textAlign="center">
                                                {error.message}
                                            </Paragraph>
                                        </FadeInBox>
                                    ) : (
                                        <></>
                                    )}
                                </AnimatePresence>
                            </Box>
                        )
                    }}
                </UploadImageRenderer>
            ) : (
                <InteractiveTownsToken
                    mintMode
                    reduceMotion
                    size={_isTouch ? 'md' : 'xl'}
                    spaceName={spaceName}
                    address={transactionDetails.townAddress}
                    imageSrc={imageSrc ?? undefined}
                />
            )}
        </Box>
    )
}
