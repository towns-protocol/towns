import React, { startTransition, useCallback, useState } from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common/react'
import { ComboboxProvider, useComboboxStore } from '@ariakit/react'
import { ComboboxContextWrapperProps } from './types'

export const ComboboxContextWrapper = withRef<typeof PlateElement, ComboboxContextWrapperProps>(
    ({ Component, ...props }, ref) => {
        const [query, setQuery] = useState('')

        const setValueCb = useCallback(
            (newValue: string) => startTransition(() => setQuery(newValue)),
            [setQuery],
        )

        const store = useComboboxStore({
            placement: 'top',
            defaultOpen: true,
            setValue: setValueCb,
        })

        return (
            <ComboboxProvider store={store}>
                <Component {...props} ref={ref} query={query} setQuery={setQuery} />
            </ComboboxProvider>
        )
    },
)
