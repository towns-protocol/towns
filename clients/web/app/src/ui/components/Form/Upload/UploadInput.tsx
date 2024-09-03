import { clsx } from 'clsx'
import React, { ChangeEvent, ForwardedRef, MutableRefObject, forwardRef } from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'

type Props<T extends FieldValues> = {
    name: Path<T>
    className?: string[]
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    onClick?: () => void
    accept?: string
    dataTestId?: string
} & Pick<UseFormReturn<T>, 'register'>

const InputComponent = <T extends FieldValues>(
    props: Props<T>,
    ref: ForwardedRef<HTMLInputElement>,
) => {
    const { register, name, className, onChange, accept, dataTestId } = props

    const { ref: hookFormRef, onChange: hookFormOnChange, ...registerProps } = register(name)

    return (
        <>
            <input
                type="file"
                className={clsx([className])}
                accept={accept}
                data-testid={dataTestId}
                ref={(instance) => {
                    hookFormRef?.(instance)
                    if (ref && instance) {
                        ;(ref as MutableRefObject<HTMLInputElement>).current = instance
                    }
                }}
                onChange={(e) => {
                    hookFormOnChange?.(e) // must call this in addition to onChange to retain expected react-hook-form behavior!!
                    onChange?.(e)
                }}
                {...registerProps}
            />
        </>
    )
}

// using a generic + forwardRef + type asserion to get the correct typing
// https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref/58473012
export const UploadInput = forwardRef(InputComponent) as <T extends FieldValues>(
    props: Props<T> & { ref?: ForwardedRef<HTMLInputElement> },
) => JSX.Element
