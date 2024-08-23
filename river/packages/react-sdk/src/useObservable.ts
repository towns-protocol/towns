'use client'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { type Observable, type PersistedModel } from '@river-build/sdk'
import { isPersistedModel } from './utils'

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ObservableConfig {
    export type FromObservable<Observable_> = Observable_ extends Observable<infer Data>
        ? FromData<Data>
        : never

    // TODO: Some util props:
    // - select: select a subset of the data, or transform it
    // - remove onError is is not a persisted model data
    export type FromData<Data> = Data extends PersistedModel<infer UnwrappedData>
        ? {
              fireImmediately?: boolean
              onUpdate?: (data: UnwrappedData) => void
              onError?: (error: Error) => void
          }
        : {
              fireImmediately?: boolean
              onUpdate?: (data: Data) => void
              onError?: (error: Error) => void
          }
}

type ObservableValue<Data> = Data extends PersistedModel<infer UnwrappedData>
    ? {
          // Its a persisted object - PersistedObservable<T>
          data: UnwrappedData
          error: Error | undefined
          status: PersistedModel<Data>['status']
          isLoading: boolean
          isError: boolean
          isLoaded: boolean
      }
    : {
          // Its a non persisted object - Observable<T>
          data: Data
          error: undefined
          status: 'loading' | 'loaded'
          isLoading: boolean
          isError: false
          isLoaded: boolean
      }

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
