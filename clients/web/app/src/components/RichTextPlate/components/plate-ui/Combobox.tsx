import React, { PropsWithChildren, useCallback, useEffect } from 'react'
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
import { RoomMember } from 'use-towns-client'
import { Text, TypeaheadMenu, TypeaheadMenuItem } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { TMentionComboboxTypes, TMentionEmoji } from '../../utils/ComboboxTypes'

export const ComboboxIcon = <T extends TMentionComboboxTypes>({
    item,
}: PropsWithChildren<{ item: T }>) => {
    if ((item as RoomMember).userId) {
        return <Avatar size="avatar_sm" userId={(item as RoomMember).userId} />
    } else if ((item as TMentionEmoji).emoji) {
        return <span>{(item as TMentionEmoji).emoji}</span>
    } else {
        return <>#</>
    }
}

export const ComboBoxTrailingContent = <T extends TMentionComboboxTypes>({
    item,
}: PropsWithChildren<{ item: T }>) => {
    if ((item as { isChannelMember: boolean }).isChannelMember) {
        return null
    }
    return (
        <Text truncate color="error">
            Not in Channel
        </Text>
    )
}

export const ComboboxItem = withRef<
    'div',
    ComboboxContentItemProps<TMentionComboboxTypes> & {
        isHighlighted: boolean
        isLast: boolean
        editor: PlateEditor
        currentUser?: string
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
                Icon={<ComboboxIcon item={item.data} />}
                trailingContent={<ComboBoxTrailingContent item={item.data} />}
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

    const filteredItems = useComboboxSelectors.filteredItems() as typeof items
    const highlightedIndex = useComboboxSelectors.highlightedIndex() as number
    const activeComboboxStore = useActiveComboboxStore()!
    useComboboxContentState({ items, combobox })

    if (Array.isArray(filteredItems) && filteredItems.length === 0) {
        return null
    }

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
                    currentUser={props.currentUser}
                    onSelectItem={activeComboboxStore.get.onSelectItem()}
                    onRenderItem={onRenderItem}
                />
            ))}
        </TypeaheadMenu>
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

    return <ComboboxContent<T> combobox={combobox} {...props} editor={editor} />
}
