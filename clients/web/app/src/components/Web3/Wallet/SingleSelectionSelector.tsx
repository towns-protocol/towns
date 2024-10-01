import React, { ComponentProps, useRef } from 'react'
import { PillSelector } from '@components/DirectMessages/CreateDirectMessage/PillSelector'
import { SearchInputHeightAdjuster } from '@components/SpaceSettingsPanel/SearchInputHeightAdjuster'
import { useDevice } from 'hooks/useDevice'

export function SingleSelectionSelector<OptionType>(
    props: {
        singleSelection: (onRemoveClick: () => void) => JSX.Element | undefined
    } & Pick<
        ComponentProps<typeof PillSelector<OptionType>>,
        | 'options'
        | 'label'
        | 'optionRenderer'
        | 'getOptionKey'
        | 'emptySelectionElement'
        | 'placeholder'
        | 'keys'
    >,
) {
    const {
        options,
        label,
        optionRenderer,
        getOptionKey,
        emptySelectionElement,
        placeholder,
        singleSelection,
        keys,
    } = props
    const onRemoveClickedRef = useRef(false)
    const { isTouch } = useDevice()

    const onRemoveClick = () => {
        onRemoveClickedRef.current = true
    }

    const singleSelectionElement = singleSelection(onRemoveClick)

    if (singleSelectionElement) {
        return singleSelectionElement
    }

    return (
        <SearchInputHeightAdjuster>
            {(inputContainerRef) => (
                <PillSelector
                    hideResultsWhenNotActive
                    autoFocus={onRemoveClickedRef.current}
                    placeholder={placeholder}
                    pillRenderer={() => <></>}
                    emptySelectionElement={(props) => emptySelectionElement?.(props) ?? <></>}
                    options={options}
                    label={label}
                    initialSelection={new Set('')}
                    isError={false}
                    initialFocusIndex={isTouch ? -1 : 0}
                    keys={keys}
                    optionRenderer={(args) => optionRenderer(args)}
                    optionSorter={(o) => o}
                    getOptionKey={(opt) => getOptionKey(opt)}
                    inputContainerRef={inputContainerRef}
                />
            )}
        </SearchInputHeightAdjuster>
    )
}
