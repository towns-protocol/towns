import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Channel } from 'use-towns-client'
import { withRef } from '@udecode/cn'
import { CollectionStore, useComboboxContext } from '@ariakit/react'
import { PlateElement, TPlateEditor } from '@udecode/plate-common/react'
import { Value } from '@udecode/plate-common'
import { Box, Icon } from '@ui'
import { emojiSearch } from './emoji-search'
import {
    ComboboxContainerProps,
    ComboboxInputUserProps,
    ComboboxTypes,
    TComboboxItemWithData,
    TMentionTicker,
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
import { ComboboxTrailingTickerContent } from './ComboboxTrailingTickerContent'
import { useSearchTokens } from './useSearchTokens'

type CollectionStoreItem = ReturnType<CollectionStore['item']>

const isUserCombobox = (trigger: string) => trigger === '@'
const isChannelCombobox = (trigger: string) => trigger === '#'
const isEmojiCombobox = (trigger: string) => trigger === ':'
const isTickerCombobox = (trigger: string) => trigger === '$'

/** Combobox item UI for channels and @user mentions */
export const ComboboxItemUser = ({
    item,
    editor,
    trigger,
}: {
    trigger: string
    editor: TPlateEditor<Value>
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

export const ComboboxItemTicker = ({
    item,
    editor,
    trigger,
    onSelectTicker,
}: {
    trigger: string
    editor: TPlateEditor<Value>
    item: TComboboxItemWithData<TMentionTicker>
    onSelectTicker?: (ticker: TMentionTicker) => void
}) => {
    const getItem = useCallback(
        (_storeProps: CollectionStoreItem) => Object.assign({}, _storeProps, item),
        [item],
    )
    return (
        <InlineComboboxItem
            key={item.key}
            value={item.data.name}
            getItem={getItem}
            Icon={<TickerIcon item={item.data} />}
            trailingContent={<ComboboxTrailingTickerContent item={item.data} />}
            onClick={() => {
                onSelectTicker?.(item.data)
                onMentionSelectTriggerMap(trigger)?.(editor, item, item.text)
            }}
        />
    )
}

const TickerIcon = ({ item }: { item: TMentionTicker }) => {
    return item.imageUrl.length > 0 ? (
        <Box as="img" src={item.imageUrl} square="square_md" rounded="full" />
    ) : item.chain === '8453' ? (
        <Icon size="square_md" type="baseEth" />
    ) : (
        <Icon size="square_md" type="solana" />
    )
}

/** Combobox item UI for channels and emojis mentions */
export const ComboboxItemGeneric = ({
    item,
    editor,
    trigger,
}: {
    editor: TPlateEditor<Value>
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

export const ComboboxInput = withRef<typeof PlateElement, ComboboxInputUserProps>(
    (
        {
            className,
            getUserMentions,
            getChannelMentions,
            getTickerMentions,
            onSelectTicker,
            ...props
        },
        ref,
    ) => {
        const {
            query: searchQueryStore,
            editor,
            element: { trigger: propTrigger },
        } = props as ComboboxContainerProps
        const [, startTransition] = useTransition()

        const trigger = useRef<string>(propTrigger as string)
        const [filteredItems, setFilteredItems] = useState<TComboboxItemWithData[]>(EMPTY_ARRAY)

        const store = useComboboxContext()!
        const { data: tokenList } = useSearchTokens({
            searchString: searchQueryStore,
            enabled: isTickerCombobox(trigger.current) && searchQueryStore.length > 0,
        })

        const getAllItems = useCallback(() => {
            if (isEmojiCombobox(trigger.current) || isTickerCombobox(trigger.current)) {
                return EMPTY_ARRAY
            }
            return isUserCombobox(trigger.current) ? getUserMentions() : getChannelMentions()
        }, [getUserMentions, getChannelMentions])

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

            let _filteredItemList: TComboboxItemWithData<
                TUserWithChannel | Channel | TMentionTicker
            >[] = EMPTY_ARRAY
            if (isEmojiCombobox(trigger.current)) {
                emojiSearch(searchQueryStore).then((emojiSearchResult) => {
                    startTransition(() => {
                        setFilteredItems(emojiSearchResult)
                    })
                })
                return
            } else if (isTickerCombobox(trigger.current)) {
                _filteredItemList = tokenList ?? []
            } else if (isUserCombobox(trigger.current)) {
                _filteredItemList = getUserMentions().filter(userMentionFilter(searchQueryStore))
            } else {
                _filteredItemList = getChannelMentions().filter(
                    channelMentionFilter(searchQueryStore),
                )
            }
            startTransition(() => {
                setFilteredItems(_filteredItemList)
            })
        }, [
            getAllItems,
            searchQueryStore,
            store,
            getUserMentions,
            getChannelMentions,
            getTickerMentions,
            tokenList,
        ])

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
                } else if (isTickerCombobox(trigger.current)) {
                    return (
                        <ComboboxItemTicker
                            key={`cbox_item_${item.key}`}
                            editor={editor}
                            trigger={trigger.current}
                            item={item as TComboboxItemWithData<TMentionTicker>}
                            onSelectTicker={onSelectTicker}
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
        }, [filteredItems, editor, onSelectTicker])

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
