import { DependencyList, useCallback } from 'react'

/**
 * useAsyncButtonCallback
 * Use instead of useCallback when binding to a button click
 * Blocks input while the asyc call is in flight by disabling the button
 * If the callback throws an exception, the exception is caught and rethrown after re-enabling the button
 * @param callback - the function to call
 * @param deps - the dependencies to use for the callback
 */
export const useAsyncButtonCallback = (callback: () => Promise<void>, deps: DependencyList) => {
    return useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = event.currentTarget
            try {
                button.disabled = true
                return await callback()
            } finally {
                button.disabled = false
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [callback, ...deps],
    )
}
