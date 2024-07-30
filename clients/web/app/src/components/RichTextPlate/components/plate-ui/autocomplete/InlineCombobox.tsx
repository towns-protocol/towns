import React, {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useMemo,
} from 'react'
import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import type { ComboboxItemProps } from '@ariakit/react'
import type { UseComboboxInputResult } from '@udecode/plate-combobox'
import type { TElement } from '@udecode/plate-common'
import { clsx } from 'clsx'
import { Combobox, ComboboxItem, ComboboxPopover, Portal, useComboboxContext } from '@ariakit/react'
import { filterWords, useComboboxInput, useHTMLInputCursorState } from '@udecode/plate-combobox'
import {
    createPointRef,
    findNodePath,
    getPointBefore,
    insertText,
    isHotkey,
    moveSelection,
    useComposedRef,
    useEditorRef,
} from '@udecode/plate-common'
import { useDevice } from 'hooks/useDevice'
import { Box } from '@ui'
import { TypeaheadMenuItem, TypeaheadMenuItemProps } from './Typeahead'
import { typeaheadMenuWrapper } from './Typeahead/Typeahead.css'
import { onMentionSelectTriggerMap } from './helpers'
import { mentionInputInner, mentionInputInvisibleSpan } from '../../../RichTextEditor.css'
import { dispatchMockEnterEvent } from '../../../utils/helpers'
import { FilterFn, TComboboxItemWithData } from './types'

interface InlineComboboxContextValue {
    filter: FilterFn | false
    inputProps: UseComboboxInputResult['props']
    inputRef: RefObject<HTMLInputElement>
    cancelInput: UseComboboxInputResult['cancelInput']
    removeInput: UseComboboxInputResult['removeInput']
    showTrigger: boolean
    trigger: string
}

const InlineComboboxContext = createContext<InlineComboboxContextValue>(null as never)

export const defaultFilter: FilterFn = ({ keywords = [], value }, search) =>
    [value, ...keywords].some((keyword) => filterWords(keyword, search))

interface InlineComboboxProps {
    children: ReactNode
    element: TElement
    trigger: string
    filter?: FilterFn | false
    hideWhenNoValue?: boolean
    setValue?: (value: string) => void
    showTrigger?: boolean
    value?: string
}

const InlineCombobox = ({
    children,
    element,
    filter = defaultFilter,
    showTrigger = true,
    trigger,
    value,
}: InlineComboboxProps) => {
    const editor = useEditorRef()
    const inputRef = React.useRef<HTMLInputElement>(null)
    const cursorState = useHTMLInputCursorState(inputRef)

    /**
     * Track the point just before the input element so we know where to
     * insertText if the combobox closes due to a selection change.
     */
    const insertPoint = useMemo(() => {
        const path = findNodePath(editor, element)

        if (!path) {
            return
        }

        const point = getPointBefore(editor, path)

        if (!point) {
            return
        }

        return createPointRef(editor, point)
    }, [editor, element])

    useEffect(() => {
        return () => {
            if (insertPoint) {
                insertPoint.unref()
            }
        }
    }, [insertPoint])

    const {
        props: inputProps,
        cancelInput,
        removeInput,
    } = useComboboxInput({
        cancelInputOnBlur: true,
        cancelInputOnDeselect: true,
        cancelInputOnEscape: true,
        cursorState,
        onCancelInput: (cause) => {
            if (cause !== 'backspace') {
                insertText(editor, trigger + value, {
                    at: insertPoint?.current ?? undefined,
                })
            }
            if (cause === 'arrowLeft' || cause === 'arrowRight') {
                moveSelection(editor, {
                    distance: 1,
                    reverse: cause === 'arrowLeft',
                })
            }
        },
        ref: inputRef,
    })

    const contextValue: InlineComboboxContextValue = useMemo(
        () => ({
            filter,
            inputProps,
            inputRef,
            removeInput,
            cancelInput,
            showTrigger,
            trigger,
        }),
        [trigger, showTrigger, filter, inputRef, inputProps, cancelInput, removeInput],
    )

    return (
        <span contentEditable={false}>
            <InlineComboboxContext.Provider value={contextValue}>
                {children}
            </InlineComboboxContext.Provider>
        </span>
    )
}

const InlineComboboxInput = forwardRef<
    HTMLInputElement,
    HTMLAttributes<HTMLInputElement> & { resultsLength: number }
>(({ className, resultsLength, ...props }, propRef) => {
    const {
        inputProps,
        inputRef: contextRef,
        showTrigger,
        trigger,
        cancelInput,
        removeInput,
    } = useContext(InlineComboboxContext)
    const { onKeyDown } = inputProps
    const editor = useEditorRef()
    const { isTouch } = useDevice()
    const store = useComboboxContext()!
    const value = store.useState('value')

    const ref = useComposedRef(propRef, contextRef)

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            /*
             * On touch devices, especially Safari iOS, the input is not removed when user presses Backspace on an
             * empty input. This is a workaround to remove the input in that case.
             *
             * Do NOT use isHotkey here because it doesn't work on Safari. The KeyUp event is fired too quickly
             * for the plugin to detect the Backspace key.
             */
            if (isTouch && event.key === 'Backspace' && contextRef.current?.value === '') {
                event.preventDefault()
                event.stopPropagation()
                removeInput(true)
                return
            }

            /**
             * If there is only one item suggestion when user presses space, and the typed value is the same
             * as the suggestion, select it
             */
            if (isHotkey('Space', event) && resultsLength === 1) {
                const firstResult = store.getState().items?.[0] as unknown as TComboboxItemWithData
                if (
                    firstResult &&
                    store.getState().value.toLowerCase() === firstResult.text.toLowerCase()
                ) {
                    removeInput(true)
                    onMentionSelectTriggerMap(trigger)?.(editor, firstResult, firstResult.text)
                    return
                }
            }

            /**
             * If there are no item suggestion when user presses enter or space, remove the input
             * and combobox, append the existing value to the editor as text node (handled in cancelInput)
             *
             * In the end we dispatch that keyboard event to the editor because combobox events are not
             * propagated to the editor by default. SetTimeout is used to ensure that editor migrations
             * are done before the event is dispatched.
             */
            if ((isHotkey('Enter', event) || isHotkey('Space', event)) && resultsLength === 0) {
                event.preventDefault()
                event.stopPropagation()
                cancelInput('manual', true)
                if (isHotkey('Enter', event)) {
                    setTimeout(dispatchMockEnterEvent, 10)
                } else {
                    editor.insertText(' ')
                }
                return
            }

            onKeyDown?.(event)
        },
        [
            isTouch,
            contextRef,
            resultsLength,
            onKeyDown,
            removeInput,
            store,
            trigger,
            editor,
            cancelInput,
        ],
    )

    /**
     * To create an auto-resizing input, we render a visually hidden span
     * containing the input value and position the input element on top of it.
     * This works well for all cases except when input exceeds the width of the
     * container.
     */

    return (
        <>
            {showTrigger && (
                <Box as="span" display="inline-block" className={className}>
                    {trigger}
                </Box>
            )}
            <Box as="span" position="relative" display="inline-block">
                <Box
                    as="span"
                    aria-hidden="true"
                    className={clsx([className, mentionInputInvisibleSpan])}
                >
                    {value || '\u200B'}
                </Box>

                <Combobox
                    autoSelect
                    {...inputProps}
                    {...props}
                    ref={ref}
                    value={value}
                    className={clsx([mentionInputInner, className])}
                    onKeyDown={handleKeyDown}
                />
            </Box>
        </>
    )
})

InlineComboboxInput.displayName = 'InlineComboboxInput'

const InlineComboboxContent: typeof ComboboxPopover = ({ className, ...props }) => {
    // Portal prevents CSS from leaking into popover
    return (
        <Portal>
            <ComboboxPopover {...props} className={clsx([typeaheadMenuWrapper, className])} />
        </Portal>
    )
}

export type InlineComboboxItemProps = {
    keywords?: string[]
} & ComboboxItemProps &
    Required<Pick<ComboboxItemProps, 'value'>> &
    TypeaheadMenuItemProps

const InlineComboboxItem = ({
    className,
    keywords,
    onClick,
    ...props
}: InlineComboboxItemProps) => {
    const { removeInput } = useContext(InlineComboboxContext)
    const { isTouch } = useDevice()

    const onSelectOption: React.MouseEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            removeInput(true)
            onClick?.(event)
        },
        [onClick, removeInput],
    )

    return (
        <ComboboxItem
            {...props}
            render={<TypeaheadMenuItem />}
            onClick={isTouch ? undefined : onSelectOption}
            onMouseDown={isTouch ? onSelectOption : undefined}
        />
    )
}

export { InlineCombobox, InlineComboboxContent, InlineComboboxInput, InlineComboboxItem }
