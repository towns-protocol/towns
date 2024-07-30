import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_CODE_LINE } from '@udecode/plate-code-block'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import { ELEMENT_MENTION_INPUT, TMentionInputElement } from '@udecode/plate-mention'
import {
    EElementOrText,
    PlateEditor,
    TLocation,
    TPath,
    Value,
    findNode,
    getBlockAbove,
    getNodeString,
    getNodes,
    insertFragment,
    isBlock,
    isCollapsed,
    select,
    setElements,
} from '@udecode/plate-common'
import { Range } from 'slate'
import get from 'lodash/get'
import { isType } from '@udecode/plate-utils'
import { Channel } from 'use-towns-client'

export const BREAK_TAG = '<br>'

export const isInputFocused = () => document.activeElement?.tagName === 'INPUT'

export const isLinkURIDecoded = (link: string) => {
    try {
        // '%' doesn't decode to a valid URI and throws a malformed URI
        return link === '%' || decodeURI(link) !== link
    } catch (e) {
        // saftey catch for malformed URIs
        return true
    }
}

export const isCodeBlockElement = (editor: PlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], ELEMENT_CODE_LINE)

export const isBlockquoteElement = (editor: PlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], ELEMENT_BLOCKQUOTE)

export const getMentionInputElement = (editor: PlateEditor) =>
    findNode<TMentionInputElement>(editor, {
        match: { type: ELEMENT_MENTION_INPUT },
    })

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

export const dispatchMockEnterEvent = () => {
    const mockEnterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
        keyCode: 13,
    })
    document.activeElement?.dispatchEvent(mockEnterEvent)
}

export const getChannelNames = (channels?: Channel[]): string =>
    (channels || []).map((c) => c.label).join('')

export const getMentionIds = (mentions?: { displayName: string }[]): string =>
    (mentions || []).map((u) => u.displayName).join('')

/**
 * Splits selected paragraphs by new lines and inserts new paragraph nodes for each line.
 * This function is used to break a single paragraph containing multiple lines into multiple paragraphs.
 *
 * The function performs the following steps:
 * 1. Checks if there is a valid selection in the editor.
 * 2. Retrieves the selected paragraphs within the current selection.
 * 3. Splits the text content of each selected paragraph by new lines.
 * 4. Creates new paragraph nodes for each line of text.
 * 6. Inserts the newly created paragraph nodes at the position of the first selected node.
 * 7. Restores the selection to include the newly created paragraphs.
 */
export const splitParagraphsByNewLines = (editor: PlateEditor<Value>) => {
    // Get the selection from the editor
    const { selection } = editor

    if (!selection || isCollapsed(selection)) {
        return
    } // Exit if no selection

    const [startPoint, endPoint] = Range.edges(selection)

    const selectedNodes = getNodes(editor, {
        from: startPoint.path,
        to: endPoint.path,
        pass: ([n]) => n.type === ELEMENT_PARAGRAPH,
    })

    const nodesToInsert: EElementOrText<Value>[] = []
    const pathsToRemove: TPath[] = []

    // Use Editor.nodes to get all paragraph nodes
    for (const [node, path] of selectedNodes) {
        if (isType(editor, node, ELEMENT_PARAGRAPH) && isBlock(editor, node)) {
            // Get the text content of the paragraph
            const textContent = getNodeString(node)

            // Split the text content by new lines
            const lines = textContent.split('\n')

            // Create new paragraph nodes for each line of text
            const newParagraphs = lines.map((line) => ({
                type: ELEMENT_PARAGRAPH,
                children: [{ text: line }],
            }))
            // Collect the new paragraphs and paths to be inserted and removed
            nodesToInsert.push(...newParagraphs)
            pathsToRemove.push(path)
        }
    }

    if (nodesToInsert.length < 2) {
        return
    }
    insertFragment(editor, nodesToInsert, { at: pathsToRemove[0] })

    // Restore the selection
    const lastNode = nodesToInsert[nodesToInsert.length - 1]
    const textLength = (get(lastNode, 'children[0].text', '') as string).length
    const newSelection: Partial<TLocation> = {
        anchor: { path: pathsToRemove[0].concat(0), offset: 0 },
        focus: { path: [pathsToRemove[0][0] + nodesToInsert.length - 1, 0], offset: textLength },
    }
    select(editor, newSelection as TLocation)
}
