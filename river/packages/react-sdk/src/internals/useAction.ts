import { useCallback, useState } from 'react'

/**
 * Configuration options for an action.
 * It can be used to configure the behavior of the {@link useAction} hook.
 */
export type ActionConfig<Action> = {
    /** Callback function to be called when an error occurs while executing the action. */
    onError?: (err: Error) => void
    /** Callback function to be called when the action is successful. */
    onSuccess?: (data: ReturnOf<Action>) => void
}

type MultipleParams<T> = T extends unknown[] ? T : [T]

type ActionFn<T> = T extends (...args: infer Args) => Promise<infer Return>
    ? (...args: Args) => Promise<Return>
    : never

type ParamsOf<T> = Parameters<ActionFn<T>>
type ReturnOf<T> = Awaited<ReturnType<ActionFn<T>>>

/**
 * Hook to create an action from a namespace.
 * @internal
 * @param namespace - The namespace to create the action from.
 * @param fnName - The name of the action to create. Example: `Namespace.fnName`
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The action and its loading state.
 */
export const useAction = <Namespace, Key extends keyof Namespace, Fn extends Namespace[Key]>(
    namespace: Namespace | undefined,
    fnName: Key & string,
    config?: ActionConfig<Fn>,
) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'idle'>('idle')
    const [error, setError] = useState<Error | undefined>()
    const [data, setData] = useState<ReturnOf<Fn> | undefined>()

    const action = useCallback(
        async (...args: MultipleParams<ParamsOf<Fn>>): Promise<ReturnOf<Fn>> => {
            if (!namespace) {
                throw new Error(`useAction: namespace is undefined`)
            }
            const fn = namespace[fnName] as ActionFn<Fn>
            if (typeof fn !== 'function') {
                throw new Error(`useAction: fn ${fnName} is not a function`)
            }
            setStatus('loading')
            try {
                const data = (await fn.apply(namespace, args)) as ReturnOf<Fn>
                setData(data)
                setStatus('success')
                config?.onSuccess?.(data)
                return data as ReturnOf<Fn>
            } catch (error: unknown) {
                setStatus('error')
                if (error instanceof Error) {
                    setError(error)
                    config?.onError?.(error)
                }
                // Let the caller handle the error
                throw error
            } finally {
                setStatus('idle')
            }
        },
        [config, fnName, namespace],
    )
    return {
        /** The action to execute. */
        action,
        /** The data returned by the action. */
        data,
        /** The error that occurred while executing the action. */
        error,
        /** Whether the action is pending. */
        isPending: status === 'loading',
        /** Whether the action is successful. */
        isSuccess: status === 'success',
        /** Whether the action is in error. */
        isError: status === 'error',
    }
}
