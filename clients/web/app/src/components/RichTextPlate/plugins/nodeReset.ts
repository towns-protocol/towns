import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { exitBreak } from '@udecode/plate-break'
import {
    ELEMENT_CODE_BLOCK,
    ELEMENT_CODE_SYNTAX,
    isSelectionAtCodeBlockStart,
    unwrapCodeBlock,
} from '@udecode/plate-code-block'
import {
    getNodeString,
    isBlockAboveEmpty,
    isSelectionAtBlockEnd,
    isSelectionAtBlockStart,
} from '@udecode/plate-common'
import { MARK_CODE } from '@udecode/plate-basic-marks'
import { isMarkActive, toggleMark } from '@udecode/slate-utils'
import { ELEMENT_LI, ELEMENT_LIC, ELEMENT_OL, ELEMENT_UL, unwrapList } from '@udecode/plate-list'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import { ResetNodePluginRule } from '@udecode/plate-reset-node'
import { getLowestBlockquoteNode } from '../utils/helpers'
import {
    isSelectionAtBlockQuoteEnd,
    isSelectionAtCodeBlockEnd,
} from '../utils/isSelectionAtCodeBlockEnd'

type ResetNodePluginRuleWithHotKey = ResetNodePluginRule & { hotkey: string | string[] }

const resetBlockTypesCommonRule = {
    types: [ELEMENT_BLOCKQUOTE],
    defaultType: ELEMENT_PARAGRAPH,
}

const resetBlockTypesCodeBlockRule = {
    types: [ELEMENT_CODE_BLOCK],
    defaultType: ELEMENT_PARAGRAPH,
    onReset: unwrapCodeBlock,
}

const resetListBlockRule = {
    types: [ELEMENT_LI, ELEMENT_OL, ELEMENT_UL, ELEMENT_LIC],
    defaultType: ELEMENT_PARAGRAPH,
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
        ...resetBlockTypesCommonRule,
        hotkey: 'down',
        predicate: (editor) => {
            if (isSelectionAtBlockQuoteEnd(editor)) {
                editor.insertNode({ type: ELEMENT_PARAGRAPH, children: [{ text: '' }] })
                return true
            }
            return false
        },
    },
    {
        ...resetBlockTypesCommonRule,
        hotkey: 'shift+enter',
        predicate: (editor) => {
            const blockQuoteNode = getLowestBlockquoteNode(editor)
            if (!blockQuoteNode) {
                return false
            }
            if (
                isSelectionAtBlockQuoteEnd(editor) &&
                getNodeString(blockQuoteNode).endsWith('\n')
            ) {
                editor.deleteBackward('character')
                editor.insertNode({ type: ELEMENT_PARAGRAPH, children: [{ text: '' }] })
                return true
            }
            return false
        },
    },
    {
        types: [ELEMENT_CODE_BLOCK],
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
        types: [ELEMENT_CODE_SYNTAX],
        hotkey: 'right',
        predicate: (editor) => {
            if (isMarkActive(editor, MARK_CODE) && isSelectionAtBlockEnd(editor)) {
                toggleMark(editor, { key: MARK_CODE })
                editor.insertText(' ')
            }
            // return false so that the default behavior of resetting the node
            // to paragraph is not triggered
            return false
        },
    },
]
