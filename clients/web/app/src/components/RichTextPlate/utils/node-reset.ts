import { isBlockAboveEmpty, isSelectionAtBlockStart } from '@udecode/plate-common'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import { ELEMENT_LI, ELEMENT_LIC, ELEMENT_OL, ELEMENT_UL, unwrapList } from '@udecode/plate-list'
import {
    ELEMENT_CODE_BLOCK,
    isCodeBlockEmpty,
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

export const nodeResetRules = [
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
        hotkey: 'Enter',
        predicate: isCodeBlockEmpty,
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
