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
import { isEqual } from 'lodash'
import { Box, Paragraph, Stack, TextField } from '@ui'
import { useDevice } from 'hooks/useDevice'

type Props<T> = {
    emptySelectionElement?: (params: { searchTerm: string }) => JSX.Element
    getOptionKey: (option: T) => string
    keys: string[]
    label: string
    onConfirm?: () => void
    onPreviewChange?: (previewItem: T | undefined) => void
    onSelectionChange?: (selection: Set<string>) => void
    optionRenderer: (props: { option: T; selected: boolean }) => JSX.Element
    options: T[]
    optionSorter: (options: T[]) => T[]
    pillRenderer: (params: { key: string; onDelete: () => void }) => JSX.Element
    placeholder?: string
    initialFocusIndex?: number
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
    } = props

    // search field
    const fieldRef = useRef<HTMLInputElement>(null)

    // search results container
    const listRef = useRef<HTMLDivElement>(null)

    const [searchTerm, setSearchTerm] = useState<string>('')
    const [focusIndex, setFocusIndex] = useState(initialFocusIndex)
    const [selection, setSelection] = useState<Set<string>>(() => new Set())

    // -------------------------------------------------------------------------

    const prevSearchItems = useRef<T[]>([])
    const searchItems = useMemo(() => {
        // only show suggested before typing
        if (!searchTerm && selection.size > (isTouch ? 1 : 0)) {
            return []
        }
        const results = fuzzysort
            .go(searchTerm, options, { keys, all: true })
            .map((r) => r.obj)
            // prevent showing already selected options
            .filter((f) => !selection.has(getOptionKey(f)))
        const sortedResults = typeof optionSorter === 'function' ? optionSorter(results) : results

        return isEqual(sortedResults, prevSearchItems.current)
            ? prevSearchItems.current
            : sortedResults
    }, [getOptionKey, isTouch, keys, optionSorter, options, searchTerm, selection])

    useEffect(() => {
        const previewItem = searchItems[focusIndex]
        props.onPreviewChange?.(previewItem)
    }, [focusIndex, props, searchItems])

    prevSearchItems.current = searchItems

    useEffect(() => {
        if (searchItems) {
            setFocusIndex(initialFocusIndex)
        }
    }, [initialFocusIndex, searchItems])

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
                        el?.click()
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
        selection
        fieldRef.current?.focus()
    }, [selection])

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
        <Stack gap>
            {/* input container */}
            <Box
                horizontal
                paddingX="md"
                paddingY="sm"
                gap="sm"
                background="level2"
                rounded="sm"
                flexWrap="wrap"
                minHeight="x6"
                boxShadow="card"
                onClick={() => {
                    fieldRef?.current?.focus()
                }}
            >
                {Array.from(selection).map((key) => (
                    <Box horizontal key={key}>
                        {pillRenderer({
                            key,
                            onDelete: () => {
                                onDeleteItem(key)
                            },
                        })}
                    </Box>
                ))}
                <TextField
                    autoFocus
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
            {searchItems?.length ? (
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
                    <Box>
                        <Paragraph color="gray2">{props.label}</Paragraph>
                    </Box>
                    {/* list container*/}
                    <Stack gap="sm" ref={listRef}>
                        {searchItems.map((o, i) => (
                            <Box
                                key={getOptionKey(o)}
                                cursor="pointer"
                                onClick={() => onAddItem(getOptionKey(o))}
                            >
                                {optionRenderer({
                                    option: o,
                                    selected: focusIndex === i,
                                })}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            ) : (
                props.emptySelectionElement?.({ searchTerm })
            )}
        </Stack>
    )
}
