import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useSpaceData, useSpaceId, useSpaceMembers, useTimelineStore } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { Box, Divider, Icon, Paragraph, Stack, TextField } from '@ui'
import { useSearch } from 'hooks/useSearch'
import { useShortcut } from 'hooks/useShortcut'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { getSectionTitle } from 'routes/TouchSearchTab'
import { useDmChannels } from 'hooks/useDMChannels'
import { ResultItem } from './SearchResultItem'
import { CombinedResult } from './types'

export const SearchBar = () => {
    const spaceData = useSpaceData()

    const searchLabel = `Search ${spaceData?.name ?? 'Town'}`

    const [isSearchActive, setIsSearchActive] = useState(false)
    const [value, setValue] = useState('')

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            setValue(e.target.value)
        }
    }
    const onHide = useCallback(() => {
        setIsSearchActive(false)
    }, [])

    const containerRef = useRef<HTMLDivElement>(null)

    useShortcut('DisplaySearchModal', () => {
        setIsSearchActive(true)
    })

    useEffect(() => {
        if (isSearchActive) {
            const onClick = (e: MouseEvent) => {
                // allows links to be clicked before dropdown
                setTimeout(() => {
                    setIsSearchActive(false)
                })
            }
            window.addEventListener('pointerup', onClick)
            return () => {
                window.removeEventListener('pointerup', onClick)
            }
        }
    }, [isSearchActive])

    const { searchResults } = useSearch(value)
    const hasActiveResults = isSearchActive && searchResults.length > 0

    useShortcut('DismissDialog', onHide, {
        enableOnFormTags: true,
        enabled: isSearchActive,
    })

    return (
        <>
            <Box grow horizontal paddingX="lg" position="relative" width="100%" ref={containerRef}>
                <Box
                    horizontal
                    width="100%"
                    height="100%"
                    position="relative"
                    justifyContent="center"
                >
                    <AnimatePresence>
                        {spaceData && (
                            <Box
                                border={isSearchActive}
                                boxShadow={isSearchActive ? 'search' : undefined}
                                position="absolute"
                                background="level2"
                                zIndex="tooltips"
                                top="sm"
                                rounded="sm"
                                overflow="hidden"
                                maxWidth="100%"
                                width="700"
                            >
                                <Box
                                    horizontal
                                    grow
                                    background="level2"
                                    cursor={isSearchActive ? 'default' : 'pointer'}
                                    height="x5"
                                    gap="sm"
                                    alignItems="start"
                                    justifyContent="center"
                                    maxWidth="100%"
                                    borderTopLeftRadius="sm"
                                    borderTopRightRadius="sm"
                                    zIndex="tooltipsAbove"
                                    onClick={() => setIsSearchActive(true)}
                                >
                                    {isSearchActive ? (
                                        <Box horizontal centerContent height="x5">
                                            <TextField
                                                autoFocus
                                                tone="none"
                                                background="level2"
                                                height="100%"
                                                width="700"
                                                placeholder="Enter terms to search..."
                                                value={value ?? undefined}
                                                onChange={onChange}
                                            />
                                        </Box>
                                    ) : (
                                        <Box horizontal centerContent gap="sm" height="x5">
                                            <Icon type="search" color="gray2" size="square_xs" />
                                            <Paragraph color="gray2">{searchLabel}</Paragraph>
                                            {/* <ShortcutKeys keys="Meta+K" size="sm" /> */}
                                        </Box>
                                    )}
                                </Box>
                                {hasActiveResults && (
                                    <SearchResults searchResults={searchResults} onHide={onHide} />
                                )}
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>
        </>
    )
}

const SearchResults = (props: { onHide: () => void; searchResults: CombinedResult[] }) => {
    const { searchResults } = props

    const location = useLocation()
    const initialLocation = useRef(`${location.pathname}#${location.hash}`)

    useEffect(() => {
        if (`${location.pathname}#${location.hash}` !== initialLocation.current) {
            props.onHide()
        }
    }, [location.hash, location.pathname, props])

    const spaceId = useSpaceId()
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()
    const { members } = useSpaceMembers()
    const { threadsStats } = useTimelineStore(({ threadsStats }) => ({
        threadsStats,
    }))

    const miscProps = useMemo(
        () => ({ channels: [...channels, ...dmChannels], members, threadsStats, spaceId }),
        [channels, members, threadsStats, spaceId, dmChannels],
    )

    return (
        searchResults.length > 0 && (
            <Stack width="800" maxWidth="100%" maxHeight="100%" insetTop="xs">
                <Stack overflow="scroll" maxHeight="500">
                    <Box>
                        {searchResults.map((s, index, items) => {
                            const result = (
                                <ResultItem result={s} key={s.item.key} misc={miscProps} />
                            )
                            const prevItemType = items[index - 1]?.item.type
                            if (s.item.type !== prevItemType) {
                                return (
                                    <>
                                        <Divider space="sm" />
                                        <Box
                                            paddingX="md"
                                            paddingY="sm"
                                            key={s.item.type}
                                            color="gray2"
                                        >
                                            <Paragraph>{getSectionTitle(s.item.type)}</Paragraph>
                                        </Box>
                                        {result}
                                    </>
                                )
                            } else {
                                return result
                            }
                        })}
                    </Box>
                </Stack>
            </Stack>
        )
    )
}
