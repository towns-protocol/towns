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
import { useCallback, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import { RoomMember } from 'use-zion-client'
import { notUndefined } from 'ui/utils/utils'
import { Avatar, TypeaheadMenu, TypeaheadMenuItem } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { $createMentionNode } from '../nodes/MentionNode'

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 10

type Props = {
    members: RoomMember[]
    userId?: string
}

export const MentionsPlugin = (props: Props) => {
    const [editor] = useLexicalComposerContext()

    const [queryString, setQueryString] = useState<string | null>(null)

    const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
    })

    const options = useMemo(() => {
        return props.members
            .map((m) =>
                m.name
                    ? new MentionTypeaheadOption(m.name, m.userId, m.userId === props.userId)
                    : undefined,
            )
            .filter(notUndefined)
    }, [props.members, props.userId])

    const results = useMemo(
        () =>
            fuzzysort
                .go(queryString || '', options, {
                    key: 'name',
                    all: true,
                })
                .map((r) => r.obj)
                .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
        [options, queryString],
    )

    const onSelectOption = useCallback(
        (selectedOption: MenuOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
            editor.update(() => {
                if (!(selectedOption instanceof MentionTypeaheadOption)) {
                    return
                }
                const mentionNode = $createMentionNode(
                    `@${selectedOption.name}`,
                    selectedOption.userId,
                )
                const spaceNode = $createTextNode(' ')

                if (nodeToReplace) {
                    nodeToReplace.replace(mentionNode)
                }

                mentionNode.insertAfter(spaceNode)
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
        <LexicalTypeaheadMenuPlugin<MenuOption>
            triggerFn={checkForMentionMatch}
            options={results}
            menuRenderFn={(
                anchorElement,
                { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
                anchorElement.current && results.length > 0
                    ? ReactDOM.createPortal(
                          <TypeaheadMenu zIndex="tooltips">
                              {results.map((option, i, arr) => (
                                  <TypeaheadMenuItem
                                      index={i}
                                      isLast={arr.length - 1 === i}
                                      isSelected={selectedIndex === i}
                                      key={option.key}
                                      option={option}
                                      name={option.displayName + (option.isSelf ? ' (you)' : '')}
                                      Icon={<Avatar size="avatar_sm" userId={option.userId} />}
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

export const CapitalizedNameMentionsRegex = new RegExp(
    '(^|[^#])((?:' + DocumentMentionsRegex.NAME + '{' + 1 + ',})$)',
)

const PUNC = DocumentMentionsRegex.PUNCTUATION

const TRIGGERS = ['@'].join('')

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

export const AtSignMentionsRegex = new RegExp(
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
export const AtSignMentionsRegexAliasRegex = new RegExp(
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

const checkForCapitalizedNameMentions = (
    text: string,
    minMatchLength: number,
): MenuTextMatch | null => {
    const match = CapitalizedNameMentionsRegex.exec(text)
    if (match !== null) {
        // The strategy ignores leading whitespace but we need to know it's
        // length to add it to the leadOffset
        const maybeLeadingWhitespace = match[1]

        const matchingString = match[2]
        if (matchingString != null && matchingString.length >= minMatchLength) {
            return {
                leadOffset: match.index + maybeLeadingWhitespace.length,
                matchingString,
                replaceableString: matchingString,
            }
        }
    }
    return null
}

const checkForAtSignMentions = (text: string, minMatchLength: number): MenuTextMatch | null => {
    let match = AtSignMentionsRegex.exec(text)
    if (match === null) {
        match = AtSignMentionsRegexAliasRegex.exec(text)
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

const getPossibleQueryMatch = (text: string): MenuTextMatch | null => {
    const match = checkForAtSignMentions(text, 0)
    return match === null ? checkForCapitalizedNameMentions(text, 3) : match
}

class MentionTypeaheadOption extends MenuOption {
    name: string
    displayName: string
    userId: string
    isSelf: boolean

    constructor(name: string, userId: string, isSelf = false) {
        super(name)
        this.name = name
        this.displayName = getPrettyDisplayName({ name, userId }).name
        this.userId = userId
        this.isSelf = isSelf
    }
}
