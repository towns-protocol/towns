import { isBlockAboveEmpty, isSelectionAtBlockStart } from '@udecode/plate-common'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import { ResetNodePluginRule } from '@udecode/plate-reset-node'
import { ELEMENT_LI, ELEMENT_LIC, ELEMENT_OL, ELEMENT_UL, unwrapList } from '@udecode/plate-list'
import { exitBreak } from '@udecode/plate-break'
import {
    ELEMENT_CODE_BLOCK,
    isSelectionAtCodeBlockStart,
    unwrapCodeBlock,
} from '@udecode/plate-code-block'

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

export const nodeResetRules: ResetNodePluginRule[] = [
    {
        ...resetBlockTypesCommonRule,
        hotkey: 'Enter',
        predicate: isBlockAboveEmpty,
    },
    {
        ...resetBlockTypesCommonRule,
        hotkey: 'Backspace',
        predicate: isSelectionAtBlockStart,
    },
    {
        ...resetBlockTypesCodeBlockRule,
        hotkey: ['down', 'shift+enter'],
        predicate: isBlockAboveEmpty,
        onReset: (editor) => {
            editor.deleteBackward('block')
            exitBreak(editor, {})
        },
    },
    {
        ...resetBlockTypesCodeBlockRule,
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
]
