import { ChangeEvent, useCallback } from 'react'
import { FieldValues, Path, PathValue, UseFormSetValue, UseFormTrigger } from 'react-hook-form'

export function useEthInputChange<Schema extends FieldValues>(
    price: string,
    path: Path<Schema>,
    setValue: UseFormSetValue<Schema>,
    trigger: UseFormTrigger<Schema>,
) {
    return useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target as PathValue<Schema, Path<Schema>>

            if (value.includes('.')) {
                const priceHasDecimalAlready = price.toString().includes('.')
                const [, decimal] = value.split('.')

                // user deleted the only decimal number
                if (!decimal && priceHasDecimalAlready) {
                    // strip the "." from the value and set to integer
                    setValue(path, value, {
                        shouldValidate: true,
                    })
                    return
                }
                // user added decimal but hasn't enterd any numbers after it
                if (!decimal) {
                    return
                }
            }

            setValue(path, value, {
                shouldValidate: true,
            })

            trigger(path) // trigger any superRefine
        },
        [setValue, path, trigger, price],
    )
}
