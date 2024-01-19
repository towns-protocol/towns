import React, { ChangeEvent, useMemo } from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'react-hot-toast/headless'
import { UploadImageRequestConfig, useUploadImage } from 'api/lib/uploadImage'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'

export type UseOnImageChangeEventProps<T extends FieldValues> = {
    formFieldName: Path<T>
    resourceId: string
    type: 'spaceIcon' | 'avatar'
    imageRestrictions?: {
        maxSize?: {
            message: string
            max: number
        }
        minDimension?: {
            message: string
            min: number
        }
    }
    overrideUploadCb?: (args: Omit<UploadImageRequestConfig, 'type'>) => void
} & Pick<UseFormReturn<T>, 'setError' | 'clearErrors' | 'formState'>

export function useOnImageChangeEvent<T extends FieldValues>({
    resourceId,
    imageRestrictions,
    formFieldName,
    setError,
    clearErrors,
    type,
    overrideUploadCb,
}: UseOnImageChangeEventProps<T>) {
    const _resourceId = useMemo(() => resourceId, [resourceId])
    const {
        maxSize = {
            message: 'Upload an image less than 5MB',
            max: 5000000,
        },
        minDimension = {
            message: `Image is too small. Please upload an image with a minimum height & width of 400px.`,
            min: 400,
        },
    } = imageRestrictions ?? {}

    const { mutate: upload, isPending } = useUploadImage(resourceId)

    async function onChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files.length > 0) {
            const url = URL.createObjectURL(files[0])
            const { width, height } = await getImageDimensions(url)
            clearErrors?.([formFieldName])

            if (files[0].size > maxSize.max) {
                setError?.(formFieldName, {
                    type: 'required',
                    message: maxSize.message,
                })
                return
            }

            if (width < minDimension.min || height < minDimension.min) {
                setError?.(formFieldName, {
                    type: 'required',
                    message: minDimension.message,
                })
                return
            }

            if (overrideUploadCb) {
                overrideUploadCb({ id: _resourceId, file: files[0], imageUrl: url })
            } else {
                upload(
                    { id: _resourceId, file: files[0], type, imageUrl: url },
                    {
                        onError: (error) => {
                            if (errorHasInvalidCookieResponseHeader(error)) {
                                toast.custom((t) => (
                                    <InvalidCookieNotification
                                        toast={t}
                                        actionMessage="upload an image"
                                    />
                                ))
                            }

                            setError?.(formFieldName, {
                                message:
                                    'There was an error uploading your image. Please try again.',
                            })
                        },
                    },
                )
            }
        }
    }

    return {
        onChange,
        isPending,
    }
}

async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = src
    })
}
