import React, { useCallback, useEffect } from 'react'
import { withRef } from '@udecode/cn'
import {
    ComboboxContentItemProps,
    ComboboxContentProps,
    ComboboxProps,
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
import { RoomMember } from 'use-zion-client'
import { TypeaheadMenu, TypeaheadMenuItem } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'

export const ComboboxItem = withRef<
    'div',
    ComboboxContentItemProps<RoomMember> & {
        isHighlighted: boolean
        isLast: boolean
        editor: PlateEditor
        onSelectItem:
            | null
            | ((editor: PlateEditor, item: TComboboxItemWithData<RoomMember>) => void)
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
            ...rest
        },
        ref,
    ) => {
        const { props } = useComboboxItem({ item, index, combobox, onRenderItem })

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
                name={item.text}
                Icon={<Avatar size="avatar_sm" userId={item.data.userId} />}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
            />
        )
    },
)

export function ComboboxContent(props: ComboboxContentProps<RoomMember> & { editor: PlateEditor }) {
    const { component: Component, editor, items, combobox, onRenderItem } = props

    const filteredItems = useComboboxSelectors.filteredItems() as typeof items
    const highlightedIndex = useComboboxSelectors.highlightedIndex() as number
    const activeComboboxStore = useActiveComboboxStore()!
    useComboboxContentState({ items, combobox })

    return (
        <TypeaheadMenu zIndex="tooltips" outerBorder={false}>
            {Component ? Component({ store: activeComboboxStore }) : null}

            {(filteredItems || []).map((item, index) => (
                <ComboboxItem
                    key={item.key}
                    item={item}
                    combobox={combobox}
                    index={index}
                    isHighlighted={index === highlightedIndex}
                    isLast={index === (filteredItems || []).length - 1}
                    editor={editor}
                    onSelectItem={activeComboboxStore.get.onSelectItem()}
                    onRenderItem={onRenderItem}
                />
            ))}
        </TypeaheadMenu>
    )
}

export function Combobox({
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
}: ComboboxProps<RoomMember>) {
    const storeItems = useComboboxSelectors.items()
    const disabled = _disabled ?? (storeItems.length === 0 && !props.items?.length)

    const focusedEditorId = useEventEditorSelectors.focus?.()
    const combobox = useComboboxControls()
    const activeId = useComboboxSelectors.activeId()
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

    if (
        !combobox ||
        !selectionDefined ||
        focusedEditorId !== editorId ||
        activeId !== id ||
        disabled
    ) {
        return null
    }

    return <ComboboxContent combobox={combobox} {...props} editor={editor} />
}
