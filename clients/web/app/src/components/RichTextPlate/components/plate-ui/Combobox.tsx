import { withRef } from '@udecode/cn'
import {
    ComboboxContentItemProps,
    ComboboxContentProps,
    ComboboxProps,
    TComboboxItem,
    TComboboxItemWithData,
    comboboxActions,
    useActiveComboboxStore,
    useComboboxContentState,
    useComboboxControls,
    useComboboxSelectors,
} from '@udecode/plate-combobox'
import {
    PlateEditor,
    useEditorRef,
    useEditorSelector,
    useEventEditorSelectors,
    usePlateSelectors,
} from '@udecode/plate-common'
import { createVirtualRef } from '@udecode/plate-floating'
import { toDOMNode } from '@udecode/slate-react'
import every from 'lodash/every'
import isEqual from 'lodash/isEqual'
import React, { memo, useCallback, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import { TypeaheadMenuAnchored, TypeaheadMenuItem } from '@ui'
import { getUsernameForMention } from '../../utils/mentions'
import {
    ComboboxTypes,
    TMentionComboboxTypes,
    TUserWithChannel,
    isComboboxType,
} from '../../utils/ComboboxTypes'
import { getFilteredItemsWithoutMockEmoji } from '../../utils/helpers'
import { ComboboxIcon } from './ComboboxIcon'
import { ComboBoxTrailingContent } from './ComboboxTrailingContent'

export const ComboboxItem = withRef<
    'div',
    ComboboxContentItemProps<TMentionComboboxTypes> & {
        isHighlighted: boolean
        isLast: boolean
        editor: PlateEditor
        currentUser?: string
        comboboxType: ComboboxTypes
        onSelectItem:
            | null
            | ((editor: PlateEditor, item: TComboboxItemWithData<TMentionComboboxTypes>) => void)
    }
>(
    (
        {
            combobox,
            index,
            item,
            editor,
            onSelectItem,
            isLast,
            isHighlighted,
            onRenderItem,
            className,
            comboboxType,
            currentUser,
            ...rest
        },
        ref,
    ) => {
        const onClick = useCallback(() => {
            onSelectItem?.(editor, item)
        }, [onSelectItem, editor, item])

        const onMouseEnter = useCallback(() => {
            comboboxActions.highlightedIndex(index)
        }, [index])

        return (
            <TypeaheadMenuItem
                ref={ref}
                index={index}
                isSelected={isHighlighted}
                isLast={isLast}
                key={item.key}
                name={item.text + (currentUser === item.key ? ` (you)` : '')}
                secondaryText={getUsernameForMention<TUserWithChannel>(
                    comboboxType,
                    item as TComboboxItem<TUserWithChannel>,
                )}
                Icon={<ComboboxIcon item={item.data} comboboxType={comboboxType} />}
                trailingContent={
                    comboboxType === ComboboxTypes.userMention ? (
                        <ComboBoxTrailingContent
                            userId={(item.data as TUserWithChannel).userId}
                            isChannelMember={(item.data as TUserWithChannel).isChannelMember}
                        />
                    ) : undefined
                }
                onClick={onClick}
                onMouseEnter={onMouseEnter}
            />
        )
    },
)

type TComboboxContentProps<T extends TMentionComboboxTypes> = ComboboxContentProps<T> & {
    editor: PlateEditor
    currentUser?: string
}

const EMOJI_SEARCH_PATTERN = /[^a-zA-Z0-9\s]/gi
export const ComboboxContent = <T extends TMentionComboboxTypes>(
    props: TComboboxContentProps<T>,
) => {
    const { component: Component, editor, items, combobox, onRenderItem } = props

    useComboboxContentState({ items, combobox })
    const activeId = useComboboxSelectors.activeId()
    const query =
        activeId === ComboboxTypes.emojiMention
            ? (useComboboxSelectors.text() || '').replace(EMOJI_SEARCH_PATTERN, '')
            : useComboboxSelectors.text()
    const filteredItems = useComboboxSelectors.filteredItems() as typeof items
    const highlightedIndex = useComboboxSelectors.highlightedIndex() as number
    const activeComboboxStore = useActiveComboboxStore()!
    const inputRef = createVirtualRef(editor, editor.selection ?? undefined, {
        fallbackRect: (toDOMNode(editor, editor) as HTMLDivElement).getBoundingClientRect(),
    })

    if (
        Array.isArray(filteredItems) &&
        getFilteredItemsWithoutMockEmoji(filteredItems).length === 0
    ) {
        return null
    }

    if (!activeId) {
        return null
    }

    if (!isComboboxType(activeId)) {
        return null
    }

    return (
        <TypeaheadMenuAnchored
            targetRef={inputRef}
            portalKey={`${query}_${activeId}`}
            zIndex="tooltips"
            outerBorder={false}
        >
            {Component ? Component({ store: activeComboboxStore }) : null}

            {getFilteredItemsWithoutMockEmoji(filteredItems || []).map((item, index) => (
                <ComboboxItem
                    key={item.key}
                    item={item as TComboboxItem<T>}
                    combobox={combobox}
                    index={index}
                    isHighlighted={index === highlightedIndex}
                    isLast={index === (filteredItems || []).length - 1}
                    editor={editor}
                    currentUser={props.currentUser}
                    comboboxType={activeId}
                    onSelectItem={activeComboboxStore.get.onSelectItem()}
                    onRenderItem={onRenderItem}
                />
            ))}
        </TypeaheadMenuAnchored>
    )
}

const Combobox = <T extends TMentionComboboxTypes>({
    id,
    trigger,
    searchPattern,
    onSelectItem,
    controlled,
    maxSuggestions,
    filter,
    sort,
    disabled: _disabled,
    ...props
}: ComboboxProps<T> & { currentUser?: string }) => {
    const storeItems = useComboboxSelectors.items()
    const disabled = _disabled ?? (storeItems.length === 0 && !props.items?.length)

    const focusedEditorId = useEventEditorSelectors.focus?.()
    const combobox = useComboboxControls()
    const activeId = useComboboxSelectors.activeId()
    const query =
        activeId === ComboboxTypes.emojiMention
            ? (useComboboxSelectors.text() || '').replace(EMOJI_SEARCH_PATTERN, '')
            : useComboboxSelectors.text()
    const selectionDefined = useEditorSelector((editor) => !!editor.selection, [])
    const editorId = usePlateSelectors().id()
    const editor = useEditorRef()

    useEffect(() => {
        comboboxActions.setComboboxById({
            id,
            trigger,
            searchPattern,
            controlled,
            onSelectItem,
            maxSuggestions,
            filter,
            sort,
        })
    }, [id, trigger, searchPattern, controlled, onSelectItem, maxSuggestions, filter, sort])

    useEffect(() => {
        if (activeId !== ComboboxTypes.emojiMention) {
            return
        }

        if (!query) {
            return
        }

        if (query.length < 1) {
            comboboxActions.filteredItems([])
            comboboxActions.items([])
        } else {
            // Since Plate does not support async search out of the box, we need to fetch the emojis here
            // and update the combobox with the new list of items and filteredItems
            search(query).then((_emojis) => {
                const emojis = _emojis.slice(0, maxSuggestions ?? 5).map((_emoji) => ({
                    data: _emoji,
                    text: _emoji.name,
                    key: _emoji.emoji,
                }))
                comboboxActions.items(emojis)
                comboboxActions.filteredItems(emojis)
            })
        }
    }, [query, activeId, maxSuggestions])

    if (
        !combobox ||
        !selectionDefined ||
        focusedEditorId !== editorId ||
        activeId !== id ||
        disabled
    ) {
        return null
    }

    return <ComboboxContentMemoized<T> combobox={combobox} {...props} editor={editor} />
}

const arePropsEqualComboboxContent = (
    prevProps: TComboboxContentProps<TMentionComboboxTypes>,
    nextProps: TComboboxContentProps<TMentionComboboxTypes>,
) =>
    every(
        [
            isEqual(prevProps.items, nextProps.items),
            isEqual(prevProps.disabled, nextProps.disabled),
        ],
        true,
    )

const arePropsEqualCombobox = (
    prevProps: ComboboxProps<TMentionComboboxTypes>,
    nextProps: ComboboxProps<TMentionComboboxTypes>,
) =>
    every(
        [
            isEqual(prevProps.id, nextProps.id),
            isEqual(prevProps.items, nextProps.items),
            isEqual(prevProps.disabled, nextProps.disabled),
        ],
        true,
    )

export const ComboboxMemoized = memo(Combobox, arePropsEqualCombobox) as typeof Combobox
export const ComboboxContentMemoized = memo(
    ComboboxContent,
    arePropsEqualComboboxContent,
) as typeof ComboboxContent

let emojiCache: Array<{
    name: string
    emoji: string
    keyword: string
}>

const search = async function (string: string) {
    const { emojis } = await import('data/emojis')

    // prepare the data once, search on []keywords and name.
    emojiCache =
        emojiCache ??
        Object.values(emojis).map((emoji) => {
            const keywords = emoji.keywords
                .map((word) => word.replace(/[^a-zA-Z0-9-_\s]/gi, ''))
                .join(',')
            return { emoji: emoji.default, keywords: keywords, name: emoji.name }
        })

    return fuzzysort
        .go(string, emojiCache, {
            keys: ['name', 'keywords'],
            all: false,
            limit: 5,
            // Don't return matches with a score lower than -150
            threshold: -150,
            // Give a higher score if string matches "name" as opposed to "keyword"
            scoreFn: (match) =>
                Math.max(match[0] ? match[0].score : -151, match[1] ? match[1].score - 50 : -151),
        })
        .map((r) => ({
            name: r.obj.name,
            emoji: r.obj.emoji,
        }))
}
