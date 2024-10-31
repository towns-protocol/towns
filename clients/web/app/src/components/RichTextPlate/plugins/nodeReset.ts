import {
    BaseParagraphPlugin,
    isBlockAboveEmpty,
    isSelectionAtBlockEnd,
    isSelectionAtBlockStart,
    someNode,
} from '@udecode/plate-common'
import { BaseBlockquotePlugin } from '@udecode/plate-block-quote'
import { exitBreak } from '@udecode/plate-break'
import {
    BaseCodeBlockPlugin,
    BaseCodeSyntaxPlugin,
    isSelectionAtCodeBlockStart,
    unwrapCodeBlock,
} from '@udecode/plate-code-block'
import { BaseCodePlugin } from '@udecode/plate-basic-marks'
import { isMarkActive, toggleMark } from '@udecode/slate-utils'
import {
    BaseBulletedListPlugin,
    BaseListItemContentPlugin,
    BaseListItemPlugin,
    BaseNumberedListPlugin,
    insertListItem,
    unwrapList,
} from '@udecode/plate-list'
import { ResetNodePluginRule } from '@udecode/plate-reset-node'
import { isSelectionAtCodeBlockEnd } from '../utils/isSelectionAtCodeBlockEnd'

type ResetNodePluginRuleWithHotKey = ResetNodePluginRule & { hotkey: string | string[] }

const resetBlockTypesCommonRule = {
    types: [BaseBlockquotePlugin.key],
    defaultType: BaseParagraphPlugin.key,
}

const resetBlockTypesCodeBlockRule = {
    types: [BaseCodeBlockPlugin.key],
    defaultType: BaseParagraphPlugin.key,
    onReset: unwrapCodeBlock,
}

const resetListBlockRule = {
    types: [
        BaseBulletedListPlugin.key,
        BaseNumberedListPlugin.key,
        BaseListItemPlugin.key,
        BaseListItemContentPlugin.key,
    ],
    defaultType: BaseParagraphPlugin.key,
    onReset: unwrapList,
}

export const nodeResetRules: ResetNodePluginRuleWithHotKey[] = [
    {
        ...resetBlockTypesCommonRule,
        hotkey: 'Backspace',
        predicate: isSelectionAtBlockStart,
    },
    {
        ...resetBlockTypesCodeBlockRule,
        hotkey: 'shift+enter',
        predicate: isBlockAboveEmpty,
        onReset: (editor) => {
            editor.deleteBackward('block')
            exitBreak(editor, {})
        },
    },
    {
        ...resetBlockTypesCodeBlockRule,
        hotkey: 'down',
        predicate: isSelectionAtCodeBlockEnd,
        onReset: (editor) => {
            exitBreak(editor, {})
        },
    },
    {
        types: [BaseCodeBlockPlugin.key],
        hotkey: 'up',
        predicate: isSelectionAtCodeBlockStart,
        onReset: (editor) => exitBreak(editor, { before: true }),
    },
    {
        ...resetBlockTypesCodeBlockRule,
        hotkey: 'Backspace',
        predicate: isSelectionAtCodeBlockStart,
    },
    {
        ...resetListBlockRule,
        hotkey: 'Backspace',
        predicate: isSelectionAtBlockStart,
    },
    {
        types: [BaseCodeSyntaxPlugin.key],
        hotkey: 'right',
        predicate: (editor) => {
            if (isMarkActive(editor, BaseCodePlugin.key) && isSelectionAtBlockEnd(editor)) {
                toggleMark(editor, { key: BaseCodePlugin.key })
                editor.insertText(' ')
            }
            // return false so that the default behavior of resetting the node
            // to paragraph is not triggered
            return false
        },
    },
    {
        types: [BaseListItemContentPlugin.key],
        hotkey: 'shift+enter',
        predicate: (editor) => someNode(editor, { match: { type: BaseListItemPlugin.key } }),
        onReset: insertListItem,
    },
]
