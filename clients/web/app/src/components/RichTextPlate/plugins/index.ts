// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { withProps } from '@udecode/cn'
import { Channel } from 'use-zion-client'
import { PlateLeaf, createPlugins } from '@udecode/plate-common'
import { ELEMENT_PARAGRAPH, createParagraphPlugin } from '@udecode/plate-paragraph'
import { ELEMENT_BLOCKQUOTE, createBlockquotePlugin } from '@udecode/plate-block-quote'
import {
    ELEMENT_CODE_BLOCK,
    ELEMENT_CODE_LINE,
    ELEMENT_CODE_SYNTAX,
    createCodeBlockPlugin,
} from '@udecode/plate-code-block'
import { TComboboxItem, TComboboxItemWithData, createComboboxPlugin } from '@udecode/plate-combobox'
import { ELEMENT_LINK, createLinkPlugin } from '@udecode/plate-link'
import {
    ELEMENT_LI,
    ELEMENT_LIC,
    ELEMENT_OL,
    ELEMENT_UL,
    createListPlugin,
} from '@udecode/plate-list'
import { ELEMENT_MENTION, ELEMENT_MENTION_INPUT, createMentionPlugin } from '@udecode/plate-mention'
import {
    MARK_BOLD,
    MARK_CODE,
    MARK_ITALIC,
    MARK_STRIKETHROUGH,
    MARK_UNDERLINE,
    createBoldPlugin,
    createCodePlugin,
    createItalicPlugin,
    createStrikethroughPlugin,
    createUnderlinePlugin,
} from '@udecode/plate-basic-marks'
import { createNormalizeTypesPlugin } from '@udecode/plate-normalizers'
import { createResetNodePlugin } from '@udecode/plate-reset-node'
import { createDeletePlugin } from '@udecode/plate-select'
import { createExitBreakPlugin, createSoftBreakPlugin } from '@udecode/plate-break'
import { createDeserializeMdPlugin } from '@udecode/plate-serializer-md'
import { createAutoformatPlugin } from '@udecode/plate-autoformat'

import { BlockquoteElement } from '../ui/blockquote-element'
import { CodeBlockElement } from '../ui/code-block-element'
import { CodeLineElement } from '../ui/code-line-element'
import { CodeSyntaxLeaf } from '../ui/code-syntax-leaf'
import { LinkElement } from '../ui/link-element'
import { ListElement } from '../ui/list-element'
import { ChannelMentionElement } from '../ui/ChannelMentionElement'
import { MentionElement } from '../ui/mention-element'
import { MentionInputElement } from '../ui/mention-input-element'
import { ParagraphElement } from '../ui/paragraph-element'
import { CodeLeaf } from '../ui/code-leaf'
import { autoformatRules } from './autoformat'
import { nodeResetRules } from './node-reset'
import { createShiftEnterListPlugin } from './shiftEnterListPlugin'
import { ELEMENT_MENTION_CHANNEL, createChannelPlugin } from './createChannelPlugin'

const PlatePlugins = createPlugins(
    [
        createAutoformatPlugin({
            options: {
                rules: autoformatRules,
                enableUndoOnDelete: true,
            },
        }),
        createParagraphPlugin(),
        createBlockquotePlugin(),
        createCodeBlockPlugin({
            options: { syntax: false },
        }),
        createLinkPlugin(),
        createListPlugin(),
        createComboboxPlugin(),

        createChannelPlugin({
            options: {
                id: 'channels',
                trigger: '#',
                insertSpaceAfterMention: true,
                triggerPreviousCharPattern: /^$|^[\s"']$/,
                createMentionNode: (item: TComboboxItemWithData<Channel>) => ({
                    value: '#' + item.text,
                    channel: item.data,
                }),
            },
        }),
        createMentionPlugin({
            options: {
                id: 'users',
                insertSpaceAfterMention: true,
                triggerPreviousCharPattern: /^$|^[\s"']$/,
                createMentionNode: (item: TComboboxItem) => ({
                    value: '@' + item.text,
                    userId: item.key,
                }),
            },
        }),
        createBoldPlugin(),
        createItalicPlugin(),
        createUnderlinePlugin(),
        createStrikethroughPlugin(),
        createCodePlugin(),
        // createEmojiPlugin({
        //     renderAfterEditable: EmojiCombobox,
        // }),
        createNormalizeTypesPlugin(),
        createResetNodePlugin({
            options: {
                rules: nodeResetRules,
            },
        }),
        createDeletePlugin(),
        createSoftBreakPlugin({
            options: {
                rules: [
                    {
                        hotkey: 'shift+enter',
                        query: {
                            exclude: [ELEMENT_LIC],
                            allow: [ELEMENT_CODE_BLOCK, ELEMENT_BLOCKQUOTE],
                        },
                    },
                ],
            },
        }),
        createShiftEnterListPlugin(),
        createExitBreakPlugin({
            options: {
                rules: [
                    {
                        hotkey: 'shift+enter',
                        query: {
                            exclude: [ELEMENT_LIC],
                        },
                    },
                    {
                        hotkey: 'enter',
                        query: {
                            start: true,
                            end: true,
                            allow: [ELEMENT_CODE_BLOCK, ELEMENT_BLOCKQUOTE],
                        },
                        relative: true,
                        level: 1,
                    },
                ],
            },
        }),
        createDeserializeMdPlugin(),
    ],
    {
        components: {
            [ELEMENT_BLOCKQUOTE]: BlockquoteElement,
            [ELEMENT_CODE_BLOCK]: CodeBlockElement,
            [ELEMENT_CODE_LINE]: CodeLineElement,
            [ELEMENT_CODE_SYNTAX]: CodeSyntaxLeaf,
            [ELEMENT_LINK]: LinkElement,
            [ELEMENT_UL]: withProps(ListElement, { variant: 'ul' }),
            [ELEMENT_OL]: withProps(ListElement, { variant: 'ol' }),
            [ELEMENT_LI]: withProps(ListElement, { variant: 'li' }),
            [ELEMENT_LIC]: withProps(ListElement, { variant: 'span' }),
            [ELEMENT_MENTION]: MentionElement,
            [ELEMENT_MENTION_CHANNEL]: ChannelMentionElement,
            [ELEMENT_MENTION_INPUT]: MentionInputElement,
            [ELEMENT_PARAGRAPH]: ParagraphElement,
            [MARK_BOLD]: withProps(PlateLeaf, { as: 'strong' }),
            [MARK_CODE]: CodeLeaf,
            [MARK_ITALIC]: withProps(PlateLeaf, { as: 'em', style: { fontStyle: 'italic' } }),
            [MARK_STRIKETHROUGH]: withProps(PlateLeaf, { as: 's' }),
            [MARK_UNDERLINE]: withProps(PlateLeaf, { as: 'u' }),
        },
    },
)

export default PlatePlugins
