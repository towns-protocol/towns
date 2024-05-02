import { visit } from 'unist-util-visit'
import { Transformer } from 'unified'
import unescape from 'lodash/unescape'
import { MdastNode } from './ast-types'

/**
 * This transformers decodes HTML entities in code blocks.
 * &gt; becomes >
 */
const remarkDecodeHTMLCodeBlocks = () => {
    const transformer: Transformer = (tree, _file) => {
        visit(tree, 'code', (node: MdastNode, _index) => {
            node.value = node.value ? unescape(node.value) : node.value
        })
    }

    return transformer
}

export default remarkDecodeHTMLCodeBlocks
