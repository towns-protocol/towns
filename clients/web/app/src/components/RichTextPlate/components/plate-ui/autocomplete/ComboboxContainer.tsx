import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { InlineCombobox, InlineComboboxContent, InlineComboboxInput } from './InlineCombobox'
import { ComboboxContainerProps } from './types'
import { mentionInput } from '../../../RichTextEditor.css'
import { typeaheadMenuWrapperHidden } from './Typeahead/Typeahead.css'

export const ComboboxContainer = withRef<'div', ComboboxContainerProps>(
    (
        {
            className,
            filter,
            children,
            query,
            setQuery,
            searchResults,
            resultsLength = 0,
            ...props
        },
        ref,
    ) => {
        const { element } = props
        return (
            <PlateElement as="span" data-slate-value={element.trigger + query} ref={ref} {...props}>
                <InlineCombobox
                    showTrigger
                    element={element}
                    setValue={setQuery}
                    trigger={element.trigger}
                    value={query}
                    filter={filter}
                >
                    <InlineComboboxInput
                        resultsLength={resultsLength}
                        className={resultsLength > 0 ? mentionInput : undefined}
                    />

                    <InlineComboboxContent
                        fixed
                        arrowPadding={16}
                        className={resultsLength === 0 ? typeaheadMenuWrapperHidden : undefined}
                    >
                        {searchResults}
                    </InlineComboboxContent>
                </InlineCombobox>

                {children}
            </PlateElement>
        )
    },
)
