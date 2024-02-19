import fuzzysort from 'fuzzysort'
import React, {
    ChangeEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { isEqual, isEqualWith } from 'lodash'
import { Box, Paragraph, Stack, TextField } from '@ui'
import { useDevice } from 'hooks/useDevice'

type Props<T> = {
    emptySelectionElement?: (params: {
        searchTerm: string
        onAddItem: (customKey: string) => void
    }) => JSX.Element
    getOptionKey: (option: T) => string
    keys: string[]
    label?: string | JSX.Element
    onConfirm?: () => void
    onPreviewChange?: (previewItem: T | undefined) => void
    onSelectionChange?: (selection: Set<string>) => void
    optionRenderer: (props: {
        option: T
        selected: boolean
        onAddItem: (customKey?: string) => void
    }) => JSX.Element
    options: T[]
    optionSorter: (options: T[]) => T[]
    pillRenderer: (params: {
        key: string
        onDelete: (customKey?: string) => void
        selection: Set<string>
    }) => JSX.Element
    placeholder?: string
    initialFocusIndex?: number
    initialSelection?: Set<string>
    /**
     * Pass a function to transform the selection before rendering the pills
     * A hack for manipulating the selection strings to shove in extra data, later we should allow selection to be whatever we want
     */
    transformSelectionForPillRendering?: (selection: Set<string>) => Set<string>
    /**
     * Hides the initial search items until the input is focused
     */
    hideResultsWhenNotActive?: boolean
    autoFocus?: boolean
    inputContainerRef?: React.RefObject<HTMLDivElement>
    isError?: boolean
    fieldRefOverride?: React.RefObject<HTMLInputElement>
}

export const PillSelector = <T,>(props: Props<T>) => {
    const { isTouch } = useDevice()

    const {
        options,
        keys,
        getOptionKey,
        optionRenderer,
        optionSorter,
        pillRenderer,
        placeholder,
        initialFocusIndex = isTouch ? -1 : 0,
        transformSelectionForPillRendering,
        hideResultsWhenNotActive,
        autoFocus = true,
        inputContainerRef,
        initialSelection,
        isError,
        fieldRefOverride,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)

    // search field
    const _fieldRef = useRef<HTMLInputElement>(null)
    const fieldRef = fieldRefOverride ?? _fieldRef

    // search results container
    const listRef = useRef<HTMLDivElement>(null)

    const [searchTerm, setSearchTerm] = useState<string>('')
    const [focusIndex, setFocusIndex] = useState(initialFocusIndex)
    const [selection, setSelection] = useState<Set<string>>(() => initialSelection ?? new Set())
    const [isInsideContainer, setIsInsideContainer] = useState(false)
    // -------------------------------------------------------------------------

    const prevSearchItems = useRef<T[]>([])
    const searchItems = useMemo(() => {
        // default behavior is to show suggested before typing
        // once a selection is made, suggestions are shown once user starts typing
        if (!searchTerm && selection.size > (isTouch ? 1 : 0)) {
            return []
        }

        // hideResultsWhenNotActive hides the initial suggestion until input is focused
        if (hideResultsWhenNotActive && !isInsideContainer) {
            return []
        }

        const results = fuzzysort
            .go(searchTerm, options, { keys, all: true, threshold: -10000 })
            .map((r) => r.obj)
            // prevent showing already selected options
            .filter((f) => !selection.has(getOptionKey(f)))
        const sortedResults = typeof optionSorter === 'function' ? optionSorter(results) : results

        return isEqual(sortedResults, prevSearchItems.current)
            ? prevSearchItems.current
            : sortedResults
    }, [
        searchTerm,
        selection,
        isTouch,
        hideResultsWhenNotActive,
        isInsideContainer,
        options,
        keys,
        optionSorter,
        getOptionKey,
    ])

    useEffect(() => {
        const handleFocus = (event: FocusEvent) => {
            if (containerRef.current?.contains(event.target as Node | null)) {
                setIsInsideContainer(true)
            } else {
                setIsInsideContainer(false)
            }
        }

        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current?.contains(event.target as Node | null)) {
                setIsInsideContainer(true)
            } else {
                setIsInsideContainer(false)
            }
        }

        document.addEventListener('focus', handleFocus, true)
        document.addEventListener('click', handleClickOutside, true)

        return () => {
            document.removeEventListener('focus', handleFocus, true)
            document.removeEventListener('click', handleClickOutside, true)
        }
    }, [])

    useEffect(() => {
        const previewItem = searchItems[focusIndex]
        props.onPreviewChange?.(previewItem)
    }, [focusIndex, props, searchItems])

    prevSearchItems.current = searchItems

    const searchItemsRef = useRef<T[]>(searchItems)
    useEffect(() => {
        if (
            isEqualWith(
                searchItems,
                searchItemsRef.current,
                (a, b) => getOptionKey(a) === getOptionKey(b),
            )
        ) {
            return
        }
        searchItemsRef.current = searchItems
        setFocusIndex(initialFocusIndex)
    }, [getOptionKey, initialFocusIndex, searchItems])

    const onAddItem = useCallback((key: string) => {
        setSelection((s) => new Set(s.add(key)))
    }, [])

    const onDeleteItem = useCallback((key: string) => {
        setSelection((s) => {
            s.delete(key)
            return new Set(s)
        })
    }, [])

    // -------------------------------------------------------------------------

    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }, [])

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const searchTerm = e.currentTarget.value

            switch (e.key) {
                case 'Tab':
                case 'Enter': {
                    if (e.shiftKey || e.altKey || e.metaKey) {
                        break
                    }
                    e.preventDefault()

                    const el = listRef.current?.children[focusIndex] as HTMLDivElement
                    if (el) {
                        e.stopPropagation()
                        // grab the first click handler inside the optionRederer
                        for (let i = 0; i < el.children.length; i++) {
                            const child = el.children[i] as HTMLButtonElement
                            if (child.onclick != null) {
                                child.click()
                                break
                            }
                        }
                    } else {
                        props.onConfirm?.()
                    }
                    break
                }
                case 'ArrowUp': {
                    e.preventDefault()
                    setFocusIndex((a) => Math.max(0, a - 1))
                    break
                }
                case 'ArrowDown': {
                    e.preventDefault()
                    setFocusIndex((a) => Math.min(searchItems.length - 1, a + 1))
                    break
                }
                case 'Backspace': {
                    if (!searchTerm) {
                        e.preventDefault()
                        setSelection((s) => new Set(Array.from(s).slice(0, -1)))
                    }
                    break
                }
            }
        },
        [focusIndex, props, searchItems.length],
    )

    // -------------------------------------------------------------------------

    useEffect(() => {
        listRef.current?.children[focusIndex]?.scrollIntoView({
            block: 'center',
        })
    }, [focusIndex])

    useEffect(() => {
        if (selection.size > 0) {
            selection
            fieldRef.current?.focus()
        }
    }, [fieldRef, selection])

    // -------------------------------------------------------------------------

    const onSelectionChangeRef = useRef<Props<T>['onSelectionChange']>()
    onSelectionChangeRef.current = props.onSelectionChange

    useLayoutEffect(() => {
        if (selection) {
            setSearchTerm('')
            setFocusIndex(initialFocusIndex)
        }
        onSelectionChangeRef.current?.(selection)
    }, [initialFocusIndex, selection])

    // -------------------------------------------------------------------------

    return (
        <Stack gap ref={containerRef}>
            {/* input container */}
            <Box
                horizontal
                ref={inputContainerRef}
                paddingX="md"
                paddingY="sm"
                gap="sm"
                background="level2"
                rounded="sm"
                flexWrap="wrap"
                minHeight="x6"
                boxShadow="card"
                overflow="hidden"
                border={isError ? 'negative' : 'default'}
                onClick={() => {
                    fieldRef?.current?.focus()
                }}
            >
                {Array.from(transformSelectionForPillRendering?.(selection) ?? selection).map(
                    (key) => (
                        <Box horizontal key={key}>
                            {pillRenderer({
                                key,
                                selection,
                                onDelete: (customKey?: string) => {
                                    onDeleteItem(customKey ?? key)
                                },
                            })}
                        </Box>
                    ),
                )}
                <TextField
                    data-testid="pill-selector-input"
                    autoFocus={autoFocus}
                    ref={fieldRef}
                    tone="none"
                    value={searchTerm}
                    placeholder={placeholder}
                    paddingX="none"
                    paddingY="none"
                    height="x2"
                    size={Math.max(3, searchTerm.length + 1)}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
            </Box>
            {/* dropdown */}
            {searchItems?.length > 0 ? (
                <Box
                    padding
                    gap
                    scroll
                    rounded="sm"
                    background="level2"
                    style={{ maxHeight: 380 }}
                    boxShadow="card"
                >
                    {/* label */}
                    {typeof props.label === 'string' ? (
                        <Box>
                            <Paragraph color="gray2">{props.label}</Paragraph>
                        </Box>
                    ) : (
                        props.label
                    )}
                    {/* list container*/}
                    <Stack gap="sm" ref={listRef}>
                        {searchItems.map((o, i) => (
                            <Box key={getOptionKey(o)}>
                                {optionRenderer({
                                    option: o,
                                    selected: focusIndex === i,
                                    onAddItem: (customKey?: string) =>
                                        onAddItem(customKey ?? getOptionKey(o)),
                                })}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            ) : hideResultsWhenNotActive && !isInsideContainer ? null : (
                props.emptySelectionElement?.({
                    searchTerm,
                    onAddItem: (customKey: string) => onAddItem(customKey),
                })
            )}
        </Stack>
    )
}
