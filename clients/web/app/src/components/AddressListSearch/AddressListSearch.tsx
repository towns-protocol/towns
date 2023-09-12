import React, { useCallback, useEffect, useId, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import { Box, BoxProps, MotionBox, VList } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { TokenClickParameters } from '@components/Tokens/types'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'

const searchArrayOfData = <T extends Record<string, unknown>>(array: T[], query: string): T[] => {
    const searchTerm = query
    const regEx = new RegExp(searchTerm, 'i')
    return array.filter((obj) =>
        Object.values(obj).some((v) => {
            if (typeof v === 'string') {
                return v.match(regEx)
            }
        }),
    )
}
export function useTokenSearch<T extends Record<string, unknown>>({ data }: { data: T[] }) {
    const [results, setResults] = React.useState<T[]>([])
    const [search, setSearch] = React.useState('')
    const isCustomAddress = ethers.utils.isAddress(search) && !results.length

    // watch text input and update results
    useEffect(() => {
        if (!data) {
            return
        }
        const _results = searchArrayOfData<T>(data, search)
        setResults(_results)
    }, [data, search])

    return {
        results,
        search,
        setSearch,
        isCustomAddress,
    }
}

type UseUpdateSelectedItemsParams = {
    initialItems?: TokenDataStruct[]
    onUpdate?: (item: TokenDataStruct[]) => void
}

export function useUpdateSelectedItems({ initialItems, onUpdate }: UseUpdateSelectedItemsParams) {
    const onUpdateRef = useRef(onUpdate)
    onUpdateRef.current = onUpdate
    const [selectedItems, setSelectedItems] = React.useState<TokenDataStruct[]>(initialItems ?? [])
    const tokenIdsMap = React.useMemo(() => {
        return selectedItems.reduce((acc: Record<string, number[]>, item) => {
            acc[item.contractAddress] = item.tokenIds
            return acc
        }, {})
    }, [selectedItems])

    const toggleContract = useCallback(({ contractAddress, tokenIds }: TokenClickParameters) => {
        setSelectedItems((prev) => {
            const isSelected = prev.map((t) => t.contractAddress).includes(contractAddress)
            if (isSelected) {
                return prev.filter((t) => t.contractAddress !== contractAddress)
            }
            return [...prev, { contractAddress, tokenIds }]
        })
    }, [])

    const removeContract = useCallback((contractAddress: string) => {
        setSelectedItems((prev) => {
            return prev.filter((t) => t.contractAddress !== contractAddress)
        })
    }, [])

    const addContract = useCallback((contractAddress: string, tokenIds: number[]) => {
        setSelectedItems((prev) => {
            return [...prev, { contractAddress, tokenIds }]
        })
    }, [])

    // adds the contract + tokenId to state if doesn't exist yet, otherwise just adds tokenId
    const addTokenIdForContract = useCallback((contractAddress: string, tokenId: number) => {
        setSelectedItems((state) => {
            let item = state.find((t) => t.contractAddress === contractAddress)
            // first time adding tokenId
            if (!item) {
                item = { contractAddress, tokenIds: [tokenId] }
                state = [...state, item]
                return state
            }
            const tokenIds = item.tokenIds ?? []
            if (tokenIds.includes(tokenId)) {
                return state
            }

            return state.map((t) => {
                if (t.contractAddress === contractAddress) {
                    return { ...t, tokenIds: [...tokenIds, tokenId] }
                }
                return t
            })
        })
    }, [])

    const removeTokenIdForContract = useCallback((contractAddress: string, tokenId: number) => {
        setSelectedItems((state) => {
            const item = state.find((t) => t.contractAddress === contractAddress)
            if (!item) {
                return state
            }
            const tokenIds = item?.tokenIds
            if (!tokenIds) {
                return state
            }

            // remove tokenId, and if no tokenIds left, remove item
            return state
                .map((t) => {
                    if (t.contractAddress === contractAddress) {
                        return { ...t, tokenIds: tokenIds.filter((id) => id !== tokenId) }
                    }
                    return t
                })
                .filter((t) => t.tokenIds.length > 0)
        })
    }, [])

    const clearTokenIdsForContract = useCallback((contractAddress: string) => {
        setSelectedItems((state) => {
            return state.map((t) => {
                if (t.contractAddress === contractAddress) {
                    return { ...t, tokenIds: [] }
                }
                return t
            })
        })
    }, [])

    // emit items when changed
    useEffect(() => {
        onUpdateRef.current?.(selectedItems)
    }, [selectedItems])

    return {
        selectedItems,
        tokenIdsMap,
        toggleContract,
        removeContract,
        addContract,
        addTokenIdForContract,
        removeTokenIdForContract,
        clearTokenIdsForContract,
    }
}

export const SelectedItemsList = ({
    items,
    children,
}: {
    items: TokenDataStruct[]
    children: ({ item }: { item: string }) => JSX.Element
}) => {
    const listId = useId()

    return (
        <AnimatePresence mode="popLayout">
            {!items.length ? null : (
                <FadeInBox horizontal fast gap="lg" layout="position" padding="md">
                    <AnimatePresence mode="popLayout">
                        {items.map((item: TokenDataStruct) => {
                            return (
                                <FadeInBox
                                    preset="fadeup"
                                    key={listId + item.contractAddress}
                                    layout="position"
                                >
                                    {children({ item: item.contractAddress })}
                                </FadeInBox>
                            )
                        })}
                    </AnimatePresence>
                </FadeInBox>
            )}
        </AnimatePresence>
    )
}

export function AddressListSearch<T extends { id: string }>({
    data,
    listMinHeight,
    listMaxHeight,
    itemRenderer,
    noResults,
    noResultsText,
    children,
    header,
    loader,
}: {
    data: T[]
    listMaxHeight?: BoxProps['maxHeight']
    listMinHeight?: BoxProps['minHeight']
    itemRenderer: (data: T) => JSX.Element
    noResults?: boolean
    noResultsText?: string
    children?: React.ReactNode
    header?: () => JSX.Element
    loader?: () => JSX.Element | undefined
}) {
    return (
        <MotionBox
            padding
            layout="position"
            minHeight={listMinHeight ?? '100'}
            maxHeight={listMaxHeight ?? '500'}
            background="level3"
            rounded="sm"
        >
            {header?.()}
            {children}
            {noResults && (
                <Box alignSelf="center" paddingTop="sm">
                    {noResultsText ?? 'No results found'}
                </Box>
            )}
            <VList<T>
                padding={0}
                list={data}
                viewMargin={0}
                esimtateItemSize={50}
                itemRenderer={itemRenderer}
            />

            {loader?.()}
        </MotionBox>
    )
}
