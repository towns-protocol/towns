import { ChangeEvent, useMemo, useState } from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { FetchImageResourceType, useFetchImage } from './useFetchImage'

export type UploadImageRequestConfig = {
    id: string
    file: File
    imageUrl: string
    type: 'spaceIcon' | 'avatar'
    setProgress: (progress: number) => void
}

export type UseOnImageChangeEventProps<T extends FieldValues> = {
    formFieldName: Path<T>
    resourceId: string
    type: FetchImageResourceType
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
    onUploadImage?: (args: UploadImageRequestConfig) => void
} & Pick<UseFormReturn<T>, 'setError' | 'clearErrors' | 'formState'>

export function useOnImageChangeEvent<T extends FieldValues>({
    resourceId,
    imageRestrictions,
    formFieldName,
    setError,
    clearErrors,
    type,
    onUploadImage,
}: UseOnImageChangeEventProps<T>) {
    const _resourceId = useMemo(() => resourceId, [resourceId])
    const {
        maxSize = {
            message: 'Upload an image less than 25MB',
            max: 25_000_000,
        },
        minDimension = {
            message: `Image is too small. Please upload an image with a minimum height & width of 400px.`,
            min: 400,
        },
    } = imageRestrictions ?? {}

    const { isLoading } = useFetchImage(resourceId, type)

    const [uploadProgress, setUploadProgress] = useState<number>(0)

    const isUploading = useMemo(() => uploadProgress > 0 && uploadProgress < 100, [uploadProgress])

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

            onUploadImage?.({
                id: _resourceId,
                file: files[0],
                imageUrl: url,
                type,
                setProgress: setUploadProgress,
            })
        }
    }

    return {
        onChange,
        isLoading,
        isUploading,
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
