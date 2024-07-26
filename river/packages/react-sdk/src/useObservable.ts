'use client'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { type Observable, type PersistedModel } from '@river-build/sdk'

// TODO: Some util props:
// - select: select a subset of the data, or transform it
// - remove onError is is not a persisted model data
export type ObservableConfig<Data> = Data extends PersistedModel<infer UnwrappedData>
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
          status: 'loaded'
          isLoading: false
          isError: false
          isLoaded: true
      }

const isPersisted = <T>(value: T | PersistedModel<T>): value is PersistedModel<T> => {
    if (typeof value !== 'object') {
        return false
    }
    if (value === null) {
        return false
    }
    return 'status' in value && 'data' in value
}

export function useObservable<T>(
    observable: Observable<T>,
    config?: ObservableConfig<T>,
): ObservableValue<T> {
    const opts = useMemo(
        () => ({ fireImmediately: true, ...config }),
        [config],
    ) as ObservableConfig<T>

    const value = useSyncExternalStore(
        (subscriber) => observable.subscribe(subscriber, { fireImediately: opts?.fireImmediately }),
        () => observable.value,
    )

    useEffect(() => {
        if (isPersisted(value)) {
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
        if (isPersisted(value)) {
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
