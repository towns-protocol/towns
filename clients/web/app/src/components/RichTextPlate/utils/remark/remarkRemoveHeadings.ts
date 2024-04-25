import { visit } from 'unist-util-visit'
import { Transformer } from 'unified'
import { MdastNode } from './ast-types'

/**
 * `remark-markdown` treats `# text` as a heading, which is something we don't want in Towns.
 *
 * Therefore, we need to convert  all `headings` to `paragraph`.
 */
const remarkRemoveHeadings = () => {
    const transformer: Transformer = (tree, _file) => {
        visit(tree, 'heading', (node: MdastNode, _index) => {
            node.type = 'paragraph'
            const prefix = Array.from({ length: node.depth as number }, () => '#').join('')
            if (node.children?.[0]) {
                node.children[0].value = `${prefix} ${node.children[0].value}`
            }
            node.depth = undefined
        })
    }

    return transformer
}

export default remarkRemoveHeadings
