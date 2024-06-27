'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type Observable, type PersistedModel } from '@river-build/sdk'

export type ObservableConfig<T> = {
    fireImmediately?: boolean
    onUpdate?: (data: T) => void
    onError?: (error: Error) => void
    onSaved?: (data: T) => void
}

type ObservableReturn<T> = {
    data: T | undefined
    error: Error | undefined
    status: PersistedModel<T>['status']
    isLoading: boolean
    isError: boolean
    isSaving: boolean
    isSaved: boolean
    isLoaded: boolean
}

// Needed to treat Observable<T> and Observable<PersistedModel<T>> as the same
const makeDataModel = <T>(value: T): PersistedModel<T> => ({
    status: 'loaded',
    data: value,
})

const isPersisted = <T>(value: unknown): value is PersistedModel<T> => {
    if (typeof value !== 'object') {
        return false
    }
    if (value === null) {
        return false
    }
    return 'status' in value && 'data' in value
}

export function useObservable<T>(
    observable: Observable<T> | undefined,
    config?: ObservableConfig<T>,
): ObservableReturn<T> {
    const [value, setValue] = useState<PersistedModel<T> | undefined>(
        observable?.value
            ? isPersisted<T>(observable.value)
                ? observable?.value
                : makeDataModel(observable.value)
            : undefined,
    )

    const opts = { fireImmediately: true, ...config } satisfies ObservableConfig<T>

    const onSubscribe = useCallback(
        (newValue: PersistedModel<T> | T) => {
            let value: PersistedModel<T> | undefined
            if (isPersisted<T>(newValue)) {
                value = newValue
            } else {
                value = makeDataModel(newValue)
            }
            setValue(value)
            if (value.status === 'loaded') {
                opts.onUpdate?.(value.data)
            }
            if (value.status === 'error') {
                opts.onError?.(value.error)
            }
            if (value.status === 'saved') {
                opts.onSaved?.(value.data)
            }
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
        if (!value) {
            return {
                data: undefined,
                error: undefined,
                status: 'loading',
                isLoading: true,
                isError: false,
                isSaving: false,
                isLoaded: false,
                isSaved: false,
            }
        }
        const { data, status } = value
        return {
            data,
            error: status === 'error' ? value.error : undefined,
            status,
            isLoading: status === 'loading',
            isError: status === 'error',
            isSaving: status === 'saving',
            isLoaded: status === 'loaded',
            isSaved: status === 'saved',
        }
    }, [value]) satisfies ObservableReturn<T>

    return data
}
