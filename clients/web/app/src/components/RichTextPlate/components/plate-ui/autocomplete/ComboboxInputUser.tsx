import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Channel } from 'use-towns-client'
import { withRef } from '@udecode/cn'
import { CollectionStore, useComboboxContext } from '@ariakit/react'
import { PlateEditor, Value } from '@udecode/plate-common'
import { emojiSearch } from './emoji-search'
import {
    ComboboxInputUserProps,
    ComboboxTypes,
    TComboboxItemWithData,
    TUserWithChannel,
} from './types'
import { ComboboxIcon } from './ComboboxIcon'
import { ComboboxTrailingContent } from './ComboboxTrailingContent'
import { InlineComboboxItem } from './InlineCombobox'
import {
    channelMentionFilter,
    getUsernameForMention,
    onMentionSelectTriggerMap,
    userMentionFilter,
} from './helpers'
import { ComboboxContainer } from './ComboboxContainer'

type CollectionStoreItem = ReturnType<CollectionStore['item']>

const isUserCombobox = (trigger: string) => trigger === '@'
const isChannelCombobox = (trigger: string) => trigger === '#'
const isEmojiCombobox = (trigger: string) => trigger === ':'

/** Combobox item UI for channels and @user mentions */
export const ComboboxItemUser = ({
    item,
    editor,
    trigger,
}: {
    trigger: string
    editor: PlateEditor<Value>
    item: TComboboxItemWithData<TUserWithChannel>
}) => {
    const getItem = useCallback(
        (_storeProps: CollectionStoreItem) => Object.assign({}, _storeProps, item),
        [item],
    )
    return (
        <InlineComboboxItem
            key={item.key}
            value={item.text}
            getItem={getItem}
            secondaryText={getUsernameForMention<TUserWithChannel>(ComboboxTypes.userMention, item)}
            Icon={<ComboboxIcon item={item.data} comboboxType={ComboboxTypes.userMention} />}
            trailingContent={
                <ComboboxTrailingContent
                    userId={item.data.userId}
                    isChannelMember={item.data.isChannelMember}
                />
            }
            onClick={() => onMentionSelectTriggerMap(trigger)?.(editor, item, item.text)}
        />
    )
}

/** Combobox item UI for channels and emojis mentions */
export const ComboboxItemGeneric = ({
    item,
    editor,
    trigger,
}: {
    editor: PlateEditor<Value>
    item: TComboboxItemWithData<Channel>
    trigger: string
}) => {
    const getItem = useCallback(
        (_storeProps: CollectionStoreItem) => Object.assign({}, _storeProps, item),
        [item],
    )
    return (
        <InlineComboboxItem
            key={item.key}
            value={item.text}
            getItem={getItem}
            Icon={
                <ComboboxIcon
                    item={item.data}
                    comboboxType={
                        isChannelCombobox(trigger)
                            ? ComboboxTypes.channelMention
                            : ComboboxTypes.emojiMention
                    }
                />
            }
            onClick={() => onMentionSelectTriggerMap(trigger)?.(editor, item, item.text)}
        />
    )
}

const EMPTY_ARRAY: TComboboxItemWithData<TUserWithChannel | Channel>[] = []

export const ComboboxInput = withRef<'div', ComboboxInputUserProps>(
    ({ className, userList, channelList, ...props }, ref) => {
        const {
            query: searchQueryStore,
            editor,
            element: { trigger: propTrigger },
        } = props
        const [, startTransition] = useTransition()

        const trigger = useRef(propTrigger)
        const [filteredItems, setFilteredItems] = useState<TComboboxItemWithData[]>(EMPTY_ARRAY)

        const store = useComboboxContext()!

        const getAllItems = useCallback(() => {
            if (isEmojiCombobox(trigger.current)) {
                return EMPTY_ARRAY
            }
            return isUserCombobox(trigger.current) ? userList : channelList
        }, [userList, channelList])

        useEffect(() => {
            startTransition(() => {
                setFilteredItems(getAllItems())
            })
        }, [getAllItems, setFilteredItems])

        useEffect(() => {
            if (!isEmojiCombobox(trigger.current) && !Array.isArray(getAllItems())) {
                return
            }

            if (!searchQueryStore || searchQueryStore.length === 0) {
                startTransition(() => {
                    setFilteredItems(getAllItems())
                })
                return
            }

            let _filteredItemList: TComboboxItemWithData<TUserWithChannel | Channel>[] = EMPTY_ARRAY
            if (isEmojiCombobox(trigger.current)) {
                emojiSearch(searchQueryStore).then((emojiSearchResult) => {
                    startTransition(() => {
                        setFilteredItems(emojiSearchResult)
                    })
                })
                return
            } else if (isUserCombobox(trigger.current)) {
                _filteredItemList = userList.filter(userMentionFilter(searchQueryStore))
            } else {
                _filteredItemList = channelList.filter(channelMentionFilter(searchQueryStore))
            }
            startTransition(() => {
                setFilteredItems(_filteredItemList)
            })
        }, [getAllItems, searchQueryStore, store, userList, channelList])

        const searchResults = useMemo(() => {
            return filteredItems.map((item) => {
                if (isUserCombobox(trigger.current)) {
                    return (
                        <ComboboxItemUser
                            key={`cbox_item_${item.key}`}
                            editor={editor}
                            trigger={trigger.current}
                            item={item as TComboboxItemWithData<TUserWithChannel>}
                        />
                    )
                } else {
                    return (
                        <ComboboxItemGeneric
                            key={`cbox_item_${item.key}`}
                            editor={editor}
                            trigger={trigger.current}
                            item={item as TComboboxItemWithData<Channel>}
                        />
                    )
                }
            })
        }, [filteredItems, editor])

        return (
            <ComboboxContainer
                {...props}
                ref={ref}
                query={searchQueryStore}
                resultsLength={filteredItems.length}
                searchResults={searchResults}
            />
        )
    },
)
