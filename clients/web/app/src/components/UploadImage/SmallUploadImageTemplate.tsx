import React, { useMemo } from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Box, BoxProps, ErrorMessage, Icon, Text } from '@ui'
import { UploadInput } from 'ui/components/Form/Upload'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { UseOnImageChangeEventProps, useOnImageChangeEvent } from './useOnImageChangeEvent'
import { useImageSource } from './useImageSource'
import {
    smallUploadHoverStyles,
    smallUploadImageStyles,
    smallUploadIsLoadingStyles,
} from './UploadImage.css'

type Props<T extends FieldValues> = {
    canEdit: boolean
    resourceId: string
    formFieldName: Path<T>
    rounded?: BoxProps['rounded']
    type: UseOnImageChangeEventProps<T>['type']
    imageRestrictions?: UseOnImageChangeEventProps<T>['imageRestrictions']
    overrideUploadCb?: UseOnImageChangeEventProps<T>['overrideUploadCb']
} & Pick<UseFormReturn<T>, 'setError' | 'clearErrors' | 'formState' | 'register'>

export const SmallUploadImageTemplate = <T extends FieldValues>(props: Props<T>) => {
    const {
        formFieldName,
        type,
        resourceId,
        imageRestrictions,
        register,
        formState,
        setError,
        clearErrors,
        rounded,
        overrideUploadCb,
    } = props

    const { onChange, isPending } = useOnImageChangeEvent({
        overrideUploadCb,
        resourceId,
        type,
        imageRestrictions,
        formFieldName,
        setError,
        clearErrors,
        formState,
    })

    const { onLoad, onError, imageError, imageSrc } = useImageSource(resourceId, 'thumbnail100')

    const ref = React.useRef<HTMLInputElement>(null)

    function onClick() {
        if (isPending) {
            return
        }
        ref.current?.click()
    }

    const styles = useMemo(() => {
        if (!imageError && isPending) {
            return smallUploadIsLoadingStyles
        }
        return imageError ? '' : smallUploadHoverStyles
    }, [imageError, isPending])

    return (
        <Box gap position="relative" data-testid="upload-image-container">
            <>
                <Box
                    position="relative"
                    rounded={rounded ?? 'full'}
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
                            {!imageError && (
                                <img
                                    src={imageSrc}
                                    style={{
                                        opacity: imageError ? 0 : 1,
                                    }}
                                    className={smallUploadImageStyles}
                                    onLoad={onLoad}
                                    onError={onError}
                                />
                            )}
                        </Box>
                        <Box absoluteFill centerContent className={styles}>
                            {isPending ? (
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
                        register={register}
                        accept="image/*"
                        onChange={onChange}
                    />
                    <FieldOutline tone="accent" rounded="sm" />
                </Box>
                {formState?.errors[formFieldName] && (
                    <Box width="100%">
                        <ErrorMessage errors={formState.errors} fieldName={formFieldName} />
                    </Box>
                )}
            </>
        </Box>
    )
}
