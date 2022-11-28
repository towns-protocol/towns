import { clsx } from 'clsx'
import React, { ChangeEvent, MutableRefObject, forwardRef } from 'react'
import { UseFormReturn } from 'react-hook-form'

type Props = {
    name: string
    className?: string[]
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    onClick?: () => void
    accept?: string
} & Partial<UseFormReturn>

export const UploadInput = forwardRef<HTMLInputElement, Props>((props: Props, ref) => {
    const { register, name, className, onChange, accept } = props

    const { ref: registerRef, ...registerProps } = register?.(name) ?? {}

    return (
        <>
            <input
                type="file"
                className={clsx([className])}
                {...registerProps}
                accept={accept}
                ref={(instance) => {
                    registerRef?.(instance)
                    if (ref && instance) {
                        ;(ref as MutableRefObject<HTMLInputElement>).current = instance
                    }
                }}
                onChange={onChange}
            />
        </>
    )
})
