import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_CODE_LINE } from '@udecode/plate-code-block'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import { PlateEditor, findNode, getBlockAbove, isBlock, setElements } from '@udecode/plate-common'
import { isType } from '@udecode/plate-utils'
import { TComboboxItemBase } from '@udecode/plate-combobox'
import { VirtualRef } from '@udecode/plate-floating'
import { MOCK_EMOJI } from './ComboboxTypes'

export const BREAK_TAG = '<br>'

export const isCodeBlockElement = (editor: PlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], ELEMENT_CODE_LINE)

export const isBlockquoteElement = (editor: PlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], ELEMENT_BLOCKQUOTE)

export const getLowestBlockquoteNode = (editor: PlateEditor) => {
    return findNode(editor, {
        match: { type: ELEMENT_BLOCKQUOTE },
        mode: 'lowest',
    })?.[0]
}

export const getLowestParagraphNode = (editor: PlateEditor) => {
    return findNode(editor, {
        match: { type: ELEMENT_PARAGRAPH },
        mode: 'lowest',
    })?.[0]
}

export const setNodeType = (editor: PlateEditor, type: string) => {
    setElements(
        editor,
        { type },
        {
            match: (n) => isBlock(editor, n),
            split: true,
        },
    )
}

export const getFilteredItemsWithoutMockEmoji = (filteredItems: TComboboxItemBase[]) =>
    filteredItems.filter((item) => item.key !== MOCK_EMOJI)

export type TypeaheadPositionResult = {
    left?: string
    bottom?: string
    right?: string
}

export const getTypeaheadPosition = (targetRef: VirtualRef): TypeaheadPositionResult => {
    if (!targetRef.current) {
        return {}
    }
    const { left, bottom } = targetRef.current.getBoundingClientRect()
    const SAFETY_PAD = 50
    const MAX_TYPEAHEAD_SIZE = 250
    // Check if the typeahead will overflow the right or left side of the screen
    const isRightOverflow = left + SAFETY_PAD + MAX_TYPEAHEAD_SIZE >= window.innerWidth - SAFETY_PAD
    const isLeftOverflow = left - SAFETY_PAD - MAX_TYPEAHEAD_SIZE < 0

    const absPosition: TypeaheadPositionResult = {
        bottom: `${window.innerHeight - bottom + 30}px`,
    }

    if (window.innerWidth < left + SAFETY_PAD + MAX_TYPEAHEAD_SIZE) {
        if (isLeftOverflow) {
            absPosition.left = SAFETY_PAD + 'px'
        } else {
            absPosition.right = `${window.innerWidth - left}px`
        }
    } else {
        if (isRightOverflow) {
            absPosition.right = SAFETY_PAD + 'px'
        } else {
            absPosition.left = `${left - SAFETY_PAD / 2.5}px`
        }
    }
    return absPosition
}
