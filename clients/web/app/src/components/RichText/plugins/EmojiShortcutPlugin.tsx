import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    LexicalTypeaheadMenuPlugin,
    QueryMatch,
    TypeaheadOption,
    useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'

import { $createTextNode, TextNode } from 'lexical'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import { Text, TypeaheadMenu, TypeaheadMenuItem } from '@ui'
import { emojis } from '../data/emoji_list'
import { $createEmojiNode } from '../nodes/EmojiNode'

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5

export const EmojiShortcutPlugin = () => {
    const [editor] = useLexicalComposerContext()

    const [queryString, setQueryString] = useState<string | null>(null)

    const results = useMentionLookupService(queryString)

    const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
    })

    const options = useMemo(
        () =>
            results
                .map((result) => new EmojiTypeaheadOption(result.name, result.emoji))
                .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
        [results],
    )

    const onSelectOption = useCallback(
        (
            selectedOption: EmojiTypeaheadOption,
            nodeToReplace: TextNode | null,
            closeMenu: () => void,
        ) => {
            editor.update(() => {
                const emojiNode = $createEmojiNode('', selectedOption.picture)
                const spaceNode = $createTextNode(' ')

                if (nodeToReplace) {
                    nodeToReplace.replace(emojiNode)
                }

                emojiNode.insertAfter(spaceNode)
                spaceNode.select()
                closeMenu()
            })
        },
        [editor],
    )

    const checkForMentionMatch = useCallback(
        (text: string) => {
            const mentionMatch = getPossibleQueryMatch(text)
            const slashMatch = checkForSlashTriggerMatch(text, editor)
            return !slashMatch && mentionMatch ? mentionMatch : null
        },
        [checkForSlashTriggerMatch, editor],
    )

    return (
        <LexicalTypeaheadMenuPlugin<EmojiTypeaheadOption>
            triggerFn={checkForMentionMatch}
            options={options}
            menuRenderFn={(
                anchorElement,
                { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
                anchorElement.current && results.length > 0
                    ? ReactDOM.createPortal(
                          <TypeaheadMenu>
                              {options.map((option, i: number) => (
                                  <TypeaheadMenuItem
                                      index={i}
                                      isLast={options.length - 1 === i}
                                      isSelected={selectedIndex === i}
                                      key={option.key}
                                      option={option}
                                      Icon={<Text fontSize="lg">{option.picture}</Text>}
                                      name={`:${option.name}:`}
                                      onClick={() => {
                                          setHighlightedIndex(i)
                                          selectOptionAndCleanUp(option)
                                      }}
                                      onMouseEnter={() => {
                                          setHighlightedIndex(i)
                                      }}
                                  />
                              ))}
                          </TypeaheadMenu>,
                          anchorElement.current,
                      )
                    : null
            }
            onQueryChange={setQueryString}
            onSelectOption={onSelectOption}
        />
    )
}

const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;'
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']'

const DocumentMentionsRegex = {
    NAME,
    PUNCTUATION,
}

const PUNC = DocumentMentionsRegex.PUNCTUATION

const TRIGGERS = [':'].join('')

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]'

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
    '(?:' +
    '\\.[ |$]|' + // E.g. "r. " in "Mr. Smith"
    ' |' + // E.g. " " in "Josh Duck"
    '[' +
    PUNC +
    ']|' + // E.g. "-' in "Salier-Hellendag"
    ')'

const LENGTH_LIMIT = 75

const AtSignMentionsRegex = new RegExp(
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

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50

// Regex used to match alias.
const ColonEmojisRegexAliasRegex = new RegExp(
    '(^|\\s|\\()(' +
        '[' +
        TRIGGERS +
        ']' +
        '((?:' +
        VALID_CHARS +
        '){0,' +
        ALIAS_LENGTH_LIMIT +
        '})' +
        ')$',
)

const mentionsCache = new Map()

const dummyLookupService = {
    search(
        string: string,
        callback: (results: Array<{ name: string; emoji: string }>) => void,
    ): void {
        setTimeout(() => {
            const results = Object.keys(emojis)
                .filter((e) => e.toLowerCase().includes(string.toLowerCase()))
                .map((k: string) => ({
                    name: k,
                    emoji: emojis[k as keyof typeof emojis],
                }))

            callback(results)
        }, 100)
    },
}

function useMentionLookupService(mentionString: string | null) {
    const [results, setResults] = useState<Array<{ name: string; emoji: string }>>([])

    useEffect(() => {
        const cachedResults = mentionsCache.get(mentionString)

        if (mentionString == null) {
            setResults([])
            return
        }

        if (cachedResults === null) {
            return
        } else if (cachedResults !== undefined) {
            setResults(cachedResults)
            return
        }

        mentionsCache.set(mentionString, null)
        dummyLookupService.search(mentionString, (newResults) => {
            mentionsCache.set(mentionString, newResults)
            setResults(newResults)
        })
    }, [mentionString])

    return results
}

const checkForColonEmoijis = (text: string, minMatchLength: number) => {
    let match = AtSignMentionsRegex.exec(text)

    if (match === null) {
        match = ColonEmojisRegexAliasRegex.exec(text)
    }
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

function getPossibleQueryMatch(text: string): QueryMatch | null {
    const match = checkForColonEmoijis(text, 1)
    return match
}

class EmojiTypeaheadOption extends TypeaheadOption {
    name: string
    picture: string

    constructor(name: string, picture: string) {
        super(name)
        this.name = name
        this.picture = picture
    }
}
