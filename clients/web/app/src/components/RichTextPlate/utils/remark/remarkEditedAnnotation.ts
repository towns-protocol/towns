import { select } from 'unist-util-select'
import { Transformer } from 'unified'
import { TElement } from '@udecode/plate-common'

export const ELEMENT_EDITED = 'edited'

const edited = (withSpace = false) =>
    ({
        type: ELEMENT_EDITED,
        children: [
            {
                type: 'text',
                value: `${withSpace ? ' ' : ''}(edited)`,
                text: `${withSpace ? ' ' : ''}(edited)`,
            },
        ],
    } as TElement)

/**
 * This function adds an annotation at the end of the message if the message is edited.
 * * If last node is a paragraph, we add a special element EDITED as a child of the paragraph.
 * * If last node is not a paragraph, we add a new paragraph with the special element EDITED.
 */
const remarkEditedAnnotation = (isEdited: boolean) => () => {
    const transformer: Transformer = (tree, _file) => {
        if (!isEdited) {
            return
        }

        const lastNode = select('paragraph:last-child', tree) as TElement

        if (lastNode && lastNode.type === 'paragraph') {
            lastNode.children.push(edited(true))
        } else {
            ;(tree as unknown as TElement).children.push({
                type: 'paragraph',
                children: [edited()],
            })
        }
    }

    return transformer
}

export default remarkEditedAnnotation
