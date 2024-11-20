'use client'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { type Observable, type PersistedModel } from '@river-build/sdk'
import { isPersistedModel } from './internals/utils'

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ObservableConfig {
    /**
     * Configuration options for an observable.
     * It can be used to configure the behavior of the `useObservable` hook.
     */
    export type FromObservable<Observable_> = Observable_ extends Observable<infer Data>
        ? FromData<Data>
        : never

    // TODO: Some util props:
    // - select: select a subset of the data, or transform it
    // - remove onError is is not a persisted model data
    /**
     * Create configuration options for an observable from the data type.
     * It can be used to configure the behavior of the `useObservable` hook.
     */
    export type FromData<Data> = Data extends PersistedModel<infer UnwrappedData>
        ? {
              /**
               * Trigger the update immediately, without waiting for the first update.
               * @defaultValue true
               */
              fireImmediately?: boolean
              /** Callback function to be called when the data is updated. */
              onUpdate?: (data: UnwrappedData) => void
              // TODO: when an error occurs? store errors? river error?
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
              // TODO: when an error occurs? store errors? river error?
              /** Callback function to be called when an error occurs. */
              onError?: (error: Error) => void
          }
}

/**
 * River SyncAgent models are wrapped in a PersistedModel when they are persisted.
 * This type is used to extract the actual data from the model.
 */
type ObservableValue<Data> = Data extends PersistedModel<infer UnwrappedData>
    ? {
          // Its a persisted object - PersistedObservable<T>
          /** The data of the model. */
          data: UnwrappedData
          /** If the model is in an error state, this will be the error. */
          error: Error | undefined
          status: PersistedModel<Data>['status']
          /** True if the model is in a loading state. */
          isLoading: boolean
          /** True if the model is in an error state. */
          isError: boolean
          /** True if the data is loaded. */
          isLoaded: boolean
      }
    : {
          // Its a non persisted object - Observable<T>
          /** The data of the model. */
          data: Data
          error: undefined
          /** The status of the model. For a non persisted model, this will be either `loading` or `loaded`. */
          status: 'loading' | 'loaded'
          /** True if the model is in a loading state. */
          isLoading: boolean
          /** Non existent for a non persisted model. */
          isError: false
          /** True if the data is loaded. */
          isLoaded: boolean
      }

/**
 * This hook subscribes to an observable and returns the value of the observable.
 * @param observable - The observable to subscribe to.
 * @param config - Configuration options for the observable.
 * @returns The value of the observable.
 */
export function useObservable<T>(
    observable: Observable<T>,
    config?: ObservableConfig.FromData<T>,
): ObservableValue<T> {
    const opts = useMemo(
        () => ({ fireImmediately: true, ...config }),
        [config],
    ) as ObservableConfig.FromData<T>

    const value = useSyncExternalStore(
        (subscriber) => observable.subscribe(subscriber, { fireImediately: opts?.fireImmediately }),
        () => observable.value,
    )

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
                data: data,
                error: status === 'error' ? value.error : undefined,
                status,
                isLoading: status === 'loading',
                isError: status === 'error',
                isLoaded: status === 'loaded',
            }
        } else {
            return {
                data: value,
                error: undefined,
                status: 'loaded',
                isLoading: false,
                isError: false,
                isLoaded: true,
            }
        }
    }, [value]) as ObservableValue<T>

    return data
}
