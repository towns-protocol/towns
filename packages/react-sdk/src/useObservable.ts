'use client'
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { type Observable, type PersistedModel } from '@towns-protocol/sdk'
import { isPersistedModel } from './internals/utils'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ObservableConfig {
    /**
     * Configuration options for an observable.
     * It can be used to configure the behavior of the `useObservable` hook.
     */
    export type FromObservable<Observable_> =
        Observable_ extends Observable<infer Data> ? FromData<Data> : never

    // TODO: Some util props:
    // - select: select a subset of the data, or transform it
    // - remove onError is is not a persisted model data
    /**
     * Create configuration options for an observable from the data type.
     * It can be used to configure the behavior of the `useObservable` hook.
     */
    export type FromData<Data> =
        Data extends PersistedModel<infer UnwrappedData>
            ? {
                  /**
                   * Trigger the update immediately, without waiting for the first update.
                   * @defaultValue true
                   */
                  fireImmediately?: boolean
                  /** Callback function to be called when the data is updated. */
                  onUpdate?: (data: UnwrappedData) => void
                  // TODO: when an error occurs? store errors? RPC error?
                  /** Callback function to be called when an error occurs. */
                  onError?: (error: Error) => void
              }
            : {
                  /**
                   * Trigger the update immediately, without waiting for the first update.
                   * @defaultValue true
                   */
                  fireImmediately?: boolean
                  /** Callback function to be called when the data is updated. */
                  onUpdate?: (data: Data) => void
                  // TODO: when an error occurs? store errors? RPC error?
                  /** Callback function to be called when an error occurs. */
                  onError?: (error: Error) => void
              }
}

/**
 * The value returned by the useObservable hook.
 * If the observable is a PersistedModel, it will include error and status information.
 */
export type ObservableValue<T> = {
    /** The data of the model. */
    data: T
    /** If the model is in an error state, this will be the error. */
    error: Error | undefined
    /** The status of the model. */
    status: 'loading' | 'loaded' | 'error'
    /** True if the model is in a loading state. */
    isLoading: boolean
    /** True if the model is in an error state. */
    isError: boolean
    /** True if the data is loaded. */
    isLoaded: boolean
}

/**
 * This hook subscribes to an observable and returns the value of the observable.
 * @param observable - The observable to subscribe to.
 * @param config - Configuration options for the observable.
 * @returns The value of the observable.
 */
export function useObservable<
    Model,
    Data = Model extends PersistedModel<infer UnwrappedData> ? UnwrappedData : Model,
>(observable: Observable<Model>, config?: ObservableConfig.FromData<Model>): ObservableValue<Data> {
    const opts = useMemo(() => ({ fireImmediately: true, ...config }), [config])

    const subscribeFn = useCallback(
        (subFn: () => void) => {
            return observable.subscribe(subFn, {
                fireImediately: opts?.fireImmediately,
            })
        },
        [observable, opts?.fireImmediately],
    )

    const value = useSyncExternalStore(subscribeFn, () => observable.value)

    useEffect(() => {
        if (isPersistedModel(value)) {
            if (value.status === 'loaded') {
                opts.onUpdate?.(value.data)
            }
            if (value.status === 'error') {
                opts.onError?.(value.error)
            }
        } else {
            opts.onUpdate?.(value)
        }
    }, [opts, value])

    const data = useMemo(() => {
        if (isPersistedModel(value)) {
            const { data, status } = value
            return {
                data: data as unknown as Data,
                error: status === 'error' ? value.error : undefined,
                status,
                isLoading: status === 'loading',
                isError: status === 'error',
                isLoaded: status === 'loaded',
            }
        } else {
            return {
                data: value as unknown as Data,
                error: undefined,
                status: 'loaded' as const,
                isLoading: false,
                isError: false,
                isLoaded: true,
            }
        }
    }, [value]) satisfies ObservableValue<Data>

    return data
}
