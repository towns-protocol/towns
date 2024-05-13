import { visit } from 'unist-util-visit'
import { Transformer } from 'unified'
import unescape from 'lodash/unescape'
import { MdastNode } from './ast-types'

const unescapeHTML = (node: MdastNode, _index: number) => {
    node.value = node.value ? unescape(node.value) : node.value
}

/**
 * This transformers decodes HTML entities in code blocks.
 * &gt; becomes >
 */
const remarkDecodeHTMLCodeBlocks = () => {
    const transformer: Transformer = (tree, _file) => {
        visit(tree, 'code', unescapeHTML)
        visit(tree, 'inlineCode', unescapeHTML)
    }

    return transformer
}

export default remarkDecodeHTMLCodeBlocks
