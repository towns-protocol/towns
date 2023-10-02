import debug from 'debug'

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useSpaceId, useSpaceMembers, useTimelineStore } from 'use-zion-client'

import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Icon, Paragraph, Stack, TextField } from '@ui'
import { useSearch } from 'hooks/useSearch'
import { useShortcut } from 'hooks/useShortcut'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'

import { ResultItem } from './SearchResultItem'

const log = debug('app:search')
log.enabled = true

export const SearchModal = () => {
    const [isVisible, setIsVisible] = useState(false)

    const onHide = () => {
        setIsVisible(false)
    }

    useShortcut(
        'DisplaySearchModal',
        () => {
            setIsVisible((t) => !t)
        },
        { enableOnFormTags: true },
    )

    return isVisible ? <SearchModalContainer onHide={onHide} /> : <></>
}

const SearchModalContainer = (props: { onHide: () => void }) => {
    const [value, setValue] = useState('')

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            setValue(e.target.value)
        }
    }

    useShortcut('DismissDialog', props.onHide, { enableOnFormTags: true })

    const location = useLocation()
    const initialLocation = useRef(`${location.pathname}#${location.hash}`)

    useEffect(() => {
        if (`${location.pathname}#${location.hash}` !== initialLocation.current) {
            props.onHide()
        }
    }, [location.hash, location.pathname, props])

    const spaceId = useSpaceId()
    const channels = useSpaceChannels()
    const { members } = useSpaceMembers()
    const { threadsStats } = useTimelineStore(({ threadsStats }) => ({
        threadsStats,
    }))

    const miscProps = useMemo(
        () => ({ channels, members, threadsStats, spaceId }),
        [channels, members, threadsStats, spaceId],
    )

    const { searchResults } = useSearch(value)

    return (
        <ModalContainer stableTopAlignment onHide={props.onHide}>
            <Stack gap="lg" width="800" maxWidth="100%" maxHeight="100%">
                <Box>
                    <TextField
                        autoFocus
                        background="level2"
                        height="x8"
                        before={<Icon type="search" color="gray2" />}
                        placeholder="Start typing to search ..."
                        value={value ?? undefined}
                        onChange={onChange}
                    />
                </Box>
                {searchResults.length > 0 || value ? (
                    <Stack gap overflow="scroll" maxHeight="500">
                        {searchResults.length === 0 && value ? (
                            <Box centerContent grow color="gray2">
                                <Stack horizontal centerContent gap padding="x4">
                                    <Paragraph>
                                        No matches for{' '}
                                        <span className={atoms({ color: 'default' })}>
                                            &quot;{value}&quot;
                                        </span>
                                    </Paragraph>
                                </Stack>
                            </Box>
                        ) : (
                            searchResults.map((result) => (
                                <ResultItem
                                    key={result.searchResult.id}
                                    result={result}
                                    misc={miscProps}
                                />
                            ))
                        )}
                    </Stack>
                ) : (
                    <></>
                )}
            </Stack>
        </ModalContainer>
    )
}
