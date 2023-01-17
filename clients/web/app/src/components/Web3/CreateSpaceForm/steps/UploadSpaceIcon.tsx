import React, { ChangeEvent, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { atoms } from 'ui/styles/atoms.css'

import { Box } from 'ui/components/Box/Box'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { Text } from 'ui/components/Text/Text'
import { UploadInput } from 'ui/components/Form/Upload'
import { Icon } from '@ui'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline'

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
    name: string
} & Partial<UseFormReturn>

export const UploadSpaceIcon = (props: Props) => {
    const { setError, register, clearErrors, name, watch, setValue } = props
    const ref = React.useRef<HTMLInputElement>(null)
    const [image, setImage] = React.useState<string | null>(null)

    const url = watch?.(name)

    useEffect(() => {
        if (url) {
            setImage(url)
        }
    }, [url])

    async function onChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files.length > 0) {
            const url = URL.createObjectURL(files[0])
            const { width, height } = await getImageDimensions(url)
            clearErrors?.([name])

            if (files[0].size > MAX_SIZE) {
                setError?.(name, {
                    type: 'required',
                    message: 'Upload an image less than 5MB',
                })
                return
            }

            if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
                setError?.(name, {
                    type: 'required',
                    message: 'Image is too small',
                })
                return
            }
            // TODO: replace with image upload to somehwere
            setValue?.(name, 'https://picsum.photos/400')
        }
    }

    function onClick() {
        ref.current?.click()
    }

    return (
        <Box
            position="relative"
            rounded="sm"
            className={atoms({
                width: 'x8',
                height: 'x8',
            })}
        >
            {!image ? (
                <Box
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
                    <Icon type="camera" size="square_sm" />
                    <Text className={srOnlyClass}>Select space icon</Text>
                </Box>
            ) : (
                <Box
                    cursor="pointer"
                    role="button"
                    width="100%"
                    height="100%"
                    rounded="sm"
                    style={{ background: `no-repeat center/cover url(${image})` }}
                    onClick={onClick}
                >
                    <Text className={srOnlyClass}>Change space icon</Text>
                </Box>
            )}
            <UploadInput
                name={name}
                className={[fieldStyles.field, srOnlyClass]}
                ref={ref}
                register={register}
                accept="image/*"
                onChange={onChange}
            />
            <FieldOutline tone="etherum" rounded="sm" />
        </Box>
    )
}
