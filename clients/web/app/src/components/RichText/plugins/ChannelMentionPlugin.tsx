import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    LexicalTypeaheadMenuPlugin,
    QueryMatch,
    TypeaheadOption,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'

import fuzzysort from 'fuzzysort'
import { $createTextNode, TextNode } from 'lexical'
import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import { Channel } from 'use-zion-client'
import { Box, Stack, Text } from '@ui'
import { baseline } from 'ui/styles/vars.css'
import { notUndefined } from 'ui/utils/utils'
import { $createChannelMentionNode } from '../nodes/ChannelMentionNode'

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5

type Props = {
    channels: Channel[]
}

export const ChannelMentionPlugin = (props: Props) => {
    const [editor] = useLexicalComposerContext()

    const [queryString, setQueryString] = useState<string | null>(null)

    const options = useMemo(() => {
        return props.channels
            .map((c) => {
                return c ? new ChannelMentionTypeaheadOption(c) : undefined
            })
            .filter(notUndefined)
    }, [props.channels])

    const results = useMemo(
        () =>
            fuzzysort
                .go(queryString || '', options, {
                    key: 'label',
                    all: true,
                })
                .map((r) => r.obj)
                .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
        [options, queryString],
    )

    const onSelectOption = useCallback(
        (
            selectedOption: ChannelMentionTypeaheadOption,
            nodeToReplace: TextNode | null,
            closeMenu: () => void,
        ) => {
            editor.update(() => {
                const channelNode = $createChannelMentionNode(`#${selectedOption.channel.label}`)
                const spaceNode = $createTextNode(' ')

                if (nodeToReplace) {
                    nodeToReplace.replace(channelNode)
                }

                channelNode.insertAfter(spaceNode)
                spaceNode.select()
                closeMenu()
            })
        },
        [editor],
    )

    const checkForChannelMentionMatch = useCallback((text: string) => {
        return getPossibleQueryMatch(text) || null
    }, [])

    return (
        <LexicalTypeaheadMenuPlugin<ChannelMentionTypeaheadOption>
            triggerFn={checkForChannelMentionMatch}
            options={results}
            menuRenderFn={(
                anchorElement,
                { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
                anchorElement && options.length
                    ? ReactDOM.createPortal(
                          <Box border position="relative">
                              <Stack
                                  border
                                  style={{ bottom: baseline * 4 }}
                                  overflow="scroll"
                                  position="absolute"
                                  rounded="sm"
                                  minWidth="250"
                                  maxHeight="200"
                                  as="ul"
                              >
                                  {results.map((option, i: number) => (
                                      <MentionsTypeaheadMenuItem
                                          index={i}
                                          isLast={results.length - 1 === i}
                                          isSelected={selectedIndex === i}
                                          key={option.key}
                                          option={option}
                                          onClick={() => {
                                              setHighlightedIndex(i)
                                              selectOptionAndCleanUp(option)
                                          }}
                                          onMouseEnter={() => {
                                              setHighlightedIndex(i)
                                          }}
                                      />
                                  ))}
                              </Stack>
                          </Box>,
                          anchorElement,
                      )
                    : null
            }
            onQueryChange={setQueryString}
            onSelectOption={onSelectOption}
        />
    )
}

const MentionsTypeaheadMenuItem = (props: {
    index: number
    isSelected: boolean
    isLast?: boolean
    onClick: () => void
    onMouseEnter: () => void
    option: ChannelMentionTypeaheadOption
}) => {
    const { index, isLast, isSelected, onClick, onMouseEnter, option } = props

    return (
        <Stack
            horizontal
            gap
            padding="sm"
            as="li"
            background={isSelected ? 'level4' : 'level2'}
            borderBottom={isLast ? undefined : 'default'}
            key={option.key}
            tabIndex={-1}
            ref={option.setRefElement}
            role="option"
            aria-selected={isSelected}
            id={'typeahead-item-' + index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
        >
            <Box justifyContent="center">
                <Text truncate># {option.channel.label}</Text>
            </Box>
        </Stack>
    )
}

// TODO: determine the restrictions on channel names
const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;'
const CHANNEL = '\\b[A-Z][^\\s' + PUNCTUATION + ']'

const DocumentChannelsMentionRegEx = {
    CHANNEL,
    PUNCTUATION,
}

export const CapitalizedNameMentionsRegex = new RegExp(
    '(^|[^#])((?:' + DocumentChannelsMentionRegEx.CHANNEL + '{' + 1 + ',})$)',
)

const PUNC = DocumentChannelsMentionRegEx.PUNCTUATION

const TRIGGERS = ['#'].join('')

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]'

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
    '(?:' +
    // Don't want these in channel mentions
    // "\\.[ |$]|" + // E.g. "r. " in "Mr. Smith"
    // " |" + // E.g. " " in "Josh Duck"
    '[' +
    PUNC +
    ']|' + // E.g. "-' in "Salier-Hellendag"
    ')'

const LENGTH_LIMIT = 75

export const ChannelMentionRegex = new RegExp(
    '(^|\\s|\\()(' +
        '[' +
        TRIGGERS +
        ']' +
        '((?:' +
        VALID_CHARS +
        VALID_JOINS +
        '){0,' +
        LENGTH_LIMIT +
        '})' +
        ')$',
)

const checkForChannelMentions = (text: string, minMatchLength: number): QueryMatch | null => {
    const match = ChannelMentionRegex.exec(text)
    if (match !== null) {
        // The strategy ignores leading whitespace but we need to know it's
        // length to add it to the leadOffset
        const maybeLeadingWhitespace = match[1]

        const matchingString = match[3]
        if (matchingString.length >= minMatchLength) {
            return {
                leadOffset: match.index + maybeLeadingWhitespace.length,
                matchingString,
                replaceableString: match[2],
            }
        }
    }
    return null
}

const getPossibleQueryMatch = (text: string): QueryMatch | null => {
    const match = checkForChannelMentions(text, 0)
    return match || null
}

class ChannelMentionTypeaheadOption extends TypeaheadOption {
    channel: Channel
    label: string

    constructor(channel: Channel) {
        super(channel.label)
        this.channel = channel
        this.label = channel.label
    }
}
