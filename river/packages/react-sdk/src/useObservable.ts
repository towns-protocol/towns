'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type Observable, type PersistedModel } from '@river-build/sdk'

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
    const [value, setValue] = useState<PersistedModel<T> | T>(
        isPersisted<T>(observable.value) ? observable.value.data : observable.value,
    )

    const opts = useMemo(
        () => ({ fireImmediately: true, ...config }),
        [config],
    ) as ObservableConfig<T>

    const onSubscribe = useCallback(
        (newValue: PersistedModel<T> | T) => {
            let value: T | undefined
            if (isPersisted(newValue)) {
                value = newValue.data
                if (newValue.status === 'loaded') {
                    opts.onUpdate?.(newValue.data)
                }
                if (newValue.status === 'error') {
                    opts.onError?.(newValue.error)
                }
            } else {
                value = newValue
                opts.onUpdate?.(newValue)
            }
            setValue(value)
        },
        [opts],
    )

    useEffect(() => {
        if (!observable) {
            return
        }
        const subscription = observable.subscribe(onSubscribe, {
            fireImediately: opts?.fireImmediately,
        })
        return () => subscription.unsubscribe(onSubscribe)
    }, [opts, observable, onSubscribe])

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
