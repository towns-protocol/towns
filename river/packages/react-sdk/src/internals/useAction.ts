import { useCallback, useState } from 'react'

export type ActionConfig<Action> = {
    onError?: (err: Error) => void
    onSuccess?: (data: ReturnOf<Action>) => void
}

type MultipleParams<T> = T extends unknown[] ? T : [T]

type ActionFn<T> = T extends (...args: infer Args) => Promise<infer Return>
    ? (...args: Args) => Promise<Return>
    : never

type ParamsOf<T> = Parameters<ActionFn<T>>
type ReturnOf<T> = Awaited<ReturnType<ActionFn<T>>>

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
        action,
        data,
        error,
        isPending: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
    }
}
