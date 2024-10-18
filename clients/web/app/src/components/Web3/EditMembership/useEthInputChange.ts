import { useCallback } from 'react'
import { FieldValues, Path, PathValue, UseFormSetValue, UseFormTrigger } from 'react-hook-form'

export function useEthInputChange<Schema extends FieldValues, PathType extends Path<Schema>>(
    price: string,
    path: PathType,
    setValue: UseFormSetValue<Schema>,
    trigger: UseFormTrigger<Schema>,
) {
    return useCallback(
        (value: PathValue<Schema, PathType>) => {
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
