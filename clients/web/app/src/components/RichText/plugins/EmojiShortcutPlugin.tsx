import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    LexicalTypeaheadMenuPlugin,
    MenuOption,
    MenuTextMatch,
    useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import fuzzysort from 'fuzzysort'

import { $createTextNode, TextNode } from 'lexical'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import { Text, TypeaheadMenu, TypeaheadMenuItem } from '@ui'
import { TMentionEmoji } from '@components/RichTextPlate/utils/ComboboxTypes'
import { $createEmojiNode } from '../nodes/EmojiNode'

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5

export const EmojiShortcutPlugin = () => {
    const [editor] = useLexicalComposerContext()

    const [queryString, setQueryString] = useState<string | null>(null)

    const results = useEmojiLockupService(queryString)

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
                          <TypeaheadMenu zIndex="tooltips">
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

let emojiCache: Array<{
    name: string
    emoji: string
    keyword: string
}>

export const search = async function (string: string) {
    const { emojis } = await import('data/emojis')

    // prepare the data once, search on []keywords and name.
    emojiCache =
        emojiCache ??
        Object.values(emojis).map((emoji) => {
            const keywords = emoji.keywords
                .map((word) => word.replace(/[^a-zA-Z0-9-_\s]/gi, ''))
                .join(',')
            return { emoji: emoji.default, keywords: keywords, name: emoji.name }
        })

    return fuzzysort
        .go(string, emojiCache, {
            keys: ['name', 'keywords'],
            all: false,
            limit: 5,
            // Don't return matches with a score lower than -150
            threshold: -150,
            // Give a higher score if string matches "name" as opposed to "keyword"
            scoreFn: (match) =>
                Math.max(match[0] ? match[0].score : -151, match[1] ? match[1].score - 50 : -151),
        })
        .map((r) => ({
            name: r.obj.name,
            emoji: r.obj.emoji,
        }))
}

export function useEmojiLockupService(mentionString: string | null) {
    const [results, setResults] = useState<TMentionEmoji[]>([])

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

        async function doSearch(mentionString: string) {
            mentionsCache.set(mentionString, null)

            const newResults = await search(mentionString)

            mentionsCache.set(mentionString, newResults)
            setResults(newResults)
        }

        doSearch(mentionString)
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

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
    return checkForColonEmoijis(text, 1)
}

class EmojiTypeaheadOption extends MenuOption {
    name: string
    picture: string

    constructor(name: string, picture: string) {
        super(name)
        this.name = name
        this.picture = picture
    }
}
