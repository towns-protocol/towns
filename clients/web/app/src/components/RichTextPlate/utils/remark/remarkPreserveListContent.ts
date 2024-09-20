import { visit } from 'unist-util-visit'
import { Transformer } from 'unified'
import { ELEMENT_LIC } from '@udecode/plate-list'
import { MdastNode, defaultNodeTypes } from './ast-types'

/**
 * Plate JS prefers content inside `<li>` element to be wrapped in `<lic>`. However, `remark-markdown` wraps everything
 * inside `<li>` in a `<paragraph>`.
 *
 * Therefore, we need to convert `paragraph` inside `li` to `lic`.
 */
const remarkPreserveListContent = () => {
    const transformer: Transformer = (tree, _file) => {
        visit(tree, 'paragraph', (node: MdastNode, _index, parent: MdastNode) => {
            if (parent.type === defaultNodeTypes.listItem) {
                node.type = ELEMENT_LIC
            }
        })

        /**
         * We don't want code-block inside list. Convert `code` inside `li` to `lic` and append the
         * text inside as children of a text node.
         * @see {https://linear.app/hnt-labs/issue/TOWNS-12280}
         */
        visit(tree, 'code', (node: MdastNode, _index, parent: MdastNode) => {
            if (parent.type === defaultNodeTypes.listItem) {
                node.type = ELEMENT_LIC
                node.children = [
                    {
                        type: 'text',
                        value: '``` ' + [node.lang, node.meta, node.value].join(' '),
                    },
                ]
            }
        })
    }

    return transformer
}

export default remarkPreserveListContent
