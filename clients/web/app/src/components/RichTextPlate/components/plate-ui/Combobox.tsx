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
    useComboboxItem,
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
import React, { useCallback, useEffect } from 'react'
import { TypeaheadMenuAnchored, TypeaheadMenuItem } from '@ui'
import { search } from '@components/RichText/plugins/EmojiShortcutPlugin'
import { ComboboxTypes, TMentionComboboxTypes, TUserWithChannel } from '../../utils/ComboboxTypes'
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
        const { props } = useComboboxItem<TMentionComboboxTypes>({
            item,
            index,
            combobox,
            onRenderItem,
        })

        const onClick = useCallback(() => {
            onSelectItem?.(editor, item)
        }, [onSelectItem, editor, item])

        const onMouseEnter = useCallback(() => {
            comboboxActions.highlightedIndex(index)
        }, [index])

        return (
            <TypeaheadMenuItem
                ref={ref}
                {...props}
                {...rest}
                index={index}
                isSelected={isHighlighted}
                isLast={isLast}
                key={item.key}
                option={{
                    ...item.data,
                    setRefElement: () => ref,
                }}
                name={item.text + (currentUser === item.key ? ` (you)` : '')}
                Icon={<ComboboxIcon item={item.data} comboboxType={comboboxType} />}
                trailingContent={
                    comboboxType === ComboboxTypes.userMention && (
                        <ComboBoxTrailingContent
                            userId={(item.data as TUserWithChannel).userId}
                            isChannelMember={(item.data as TUserWithChannel).isChannelMember}
                        />
                    )
                }
                onClick={onClick}
                onMouseEnter={onMouseEnter}
            />
        )
    },
)

export const ComboboxContent = <T extends TMentionComboboxTypes>(
    props: ComboboxContentProps<T> & { editor: PlateEditor; currentUser?: string },
) => {
    const { component: Component, editor, items, combobox, onRenderItem } = props

    useComboboxContentState({ items, combobox })
    const query = (useComboboxSelectors.text() || '').replace(/[^a-zA-Z0-9-_\s]/gi, '')
    const activeId = useComboboxSelectors.activeId()
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

export const Combobox = <T extends TMentionComboboxTypes>({
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
    const query = useComboboxSelectors.text() || ''
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
        if (activeId !== ComboboxTypes.emojiMention || query.length < 1) {
            return
        }
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

    return <ComboboxContent<T> combobox={combobox} {...props} editor={editor} />
}
