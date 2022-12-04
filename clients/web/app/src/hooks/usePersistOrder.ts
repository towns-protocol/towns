import { useMemo, useRef } from 'react'

/**
 * returns a copy of the input array peristing the initial order
 *
 * [b,c,d] => [b,c,d]
 * [c,d,b] => [b,c,d]
 * [d,b] => [b,d]
 * [a,d,b] => [a,b,d]
 */
export const usePersistOrder = <T, C>(
    input: T[],
    options: {
        identityFn?: (t: T) => C
        sorterFn?: (t: T[]) => T[]
    } = {},
) => {
    const optionsRef = useRef(options)
    optionsRef.current = options

    const resultRef = useRef<T[]>(
        typeof options.sorterFn !== 'function' ? input : options.sorterFn(input),
    )

    return useMemo(() => {
        const { identityFn, sorterFn } = optionsRef.current

        // remove obsolete values
        const newResult = resultRef.current.filter((value) => {
            return typeof identityFn !== 'function'
                ? input.includes(value)
                : input.some((inputItem) => identityFn(inputItem) === identityFn(value))
        })

        // add new values
        input.forEach((inputItem, index) => {
            const existingIndex = !identityFn
                ? newResult.indexOf(inputItem)
                : newResult.findIndex((id) => identityFn(id) === identityFn(inputItem))

            if (existingIndex > -1) {
                // update current version
                newResult[existingIndex] = inputItem
            } else {
                const insertIndex =
                    typeof sorterFn !== 'function'
                        ? // insert at the same index as original array
                          index
                        : // or estimate a better position with a sorting fn
                          newResult.reduce(
                              (keep, current, index) =>
                                  sorterFn([inputItem, current])[0] === inputItem
                                      ? keep
                                      : index + 1,
                              0,
                          )
                newResult.splice(insertIndex, 0, inputItem)
            }
        }, [] as string[])

        return (resultRef.current = newResult)
    }, [input])
}
