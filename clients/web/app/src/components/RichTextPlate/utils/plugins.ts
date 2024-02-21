// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { withProps } from '@udecode/cn'
import { PlateElement, PlateLeaf, createPlugins } from '@udecode/plate-common'
import { ELEMENT_PARAGRAPH, createParagraphPlugin } from '@udecode/plate-paragraph'
import { ELEMENT_BLOCKQUOTE, createBlockquotePlugin } from '@udecode/plate-block-quote'
import {
    ELEMENT_CODE_BLOCK,
    ELEMENT_CODE_LINE,
    ELEMENT_CODE_SYNTAX,
    createCodeBlockPlugin,
} from '@udecode/plate-code-block'
import { TComboboxItem, createComboboxPlugin } from '@udecode/plate-combobox'
import { ELEMENT_LINK, createLinkPlugin } from '@udecode/plate-link'
import { ELEMENT_LI, ELEMENT_OL, ELEMENT_UL, createListPlugin } from '@udecode/plate-list'
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

import { BlockquoteElement } from '@components/RichTextPlate/ui/blockquote-element'
import { CodeBlockElement } from '@components/RichTextPlate/ui/code-block-element'
import { CodeLineElement } from '@components/RichTextPlate/ui/code-line-element'
import { CodeSyntaxLeaf } from '@components/RichTextPlate/ui/code-syntax-leaf'
import { LinkElement } from '@components/RichTextPlate/ui/link-element'
import { ListElement } from '@components/RichTextPlate/ui/list-element'
import { MentionElement } from '@components/RichTextPlate/ui/mention-element'
import { MentionInputElement } from '@components/RichTextPlate/ui/mention-input-element'
import { ParagraphElement } from '@components/RichTextPlate/ui/paragraph-element'
import { CodeLeaf } from '@components/RichTextPlate/ui/code-leaf'
import { withPlaceholders } from '@components/RichTextPlate/ui/placeholder'
import { autoformatRules } from './autoformat'
import { nodeResetRules } from './node-reset'

export const plugins = createPlugins(
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
                    { hotkey: 'shift+enter' },
                    {
                        hotkey: 'enter',
                        query: {
                            allow: [ELEMENT_CODE_BLOCK, ELEMENT_BLOCKQUOTE],
                        },
                    },
                ],
            },
        }),
        createExitBreakPlugin({
            options: {
                rules: [
                    {
                        hotkey: 'mod+enter',
                    },
                    {
                        hotkey: 'mod+shift+enter',
                        before: true,
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
        components: withPlaceholders({
            [ELEMENT_BLOCKQUOTE]: BlockquoteElement,
            [ELEMENT_CODE_BLOCK]: CodeBlockElement,
            [ELEMENT_CODE_LINE]: CodeLineElement,
            [ELEMENT_CODE_SYNTAX]: CodeSyntaxLeaf,
            [ELEMENT_LINK]: LinkElement,
            [ELEMENT_UL]: withProps(ListElement, { variant: 'ul' }),
            [ELEMENT_OL]: withProps(ListElement, { variant: 'ol' }),
            [ELEMENT_LI]: withProps(PlateElement, { as: 'li' }),
            [ELEMENT_MENTION]: MentionElement,
            [ELEMENT_MENTION_INPUT]: withProps(MentionInputElement, { prefix: '@' }),
            [ELEMENT_PARAGRAPH]: ParagraphElement,
            [MARK_BOLD]: withProps(PlateLeaf, { as: 'strong' }),
            [MARK_CODE]: CodeLeaf,
            [MARK_ITALIC]: withProps(PlateLeaf, { as: 'em', style: { fontStyle: 'italic' } }),
            [MARK_STRIKETHROUGH]: withProps(PlateLeaf, { as: 's' }),
            [MARK_UNDERLINE]: withProps(PlateLeaf, { as: 'u' }),
        }),
    },
)
