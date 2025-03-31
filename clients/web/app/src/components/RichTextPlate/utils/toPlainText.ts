import { TNode, getNodeString, isElement, isText } from '@udecode/slate'

/**
 * bare minimum plain text representation of the editor content
 * used to compare content and extract links
 */
export const toPlainText = (nodes: TNode[]) => {
    return nodes
        .map((n) => nodeToText(n))
        .join('\n')
        .trim()
}

const inlineElements = ['p', 'lic']

const nodeToText = (node: TNode, level = 0): string => {
    if (node.type === 'a') {
        return `[${getNodeString(node)}](${node.url})`
    }
    if (isText(node)) {
        return getNodeString(node)
    }
    if (!isElement(node)) {
        return ''
    }

    const children = node.children.map((n) => nodeToText(n, level + 1))

    if (node.type === 'ul') {
        return children.map((c) => `${' '.repeat(level * 2)}- ${c}`).join('\n')
    }

    if (inlineElements.includes(node.type)) {
        return children.join('')
    }

    return children.join('\n')
}
