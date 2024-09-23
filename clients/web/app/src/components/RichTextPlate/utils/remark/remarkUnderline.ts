import { visit } from 'unist-util-visit'
import { Transformer } from 'unified'
import { MdastNode, MdastNodeType, defaultNodeTypes } from './ast-types'

/**
 * By default, markdown does not support underline. This function adds support for underlining text in markdown.
 * Remark markdown converts `__text__` to `<strong>text</strong>`. In this function, we convert `<strong>text</strong>` to `<`u>text</u>`,
 * ONLY if the original markdown text is surrounded by double underscores.
 */
const remarkUnderline = (markdownSource: string) => () => {
    const transformer: Transformer = (tree, _file) => {
        visit(tree, 'strong', (node: MdastNode) => {
            if (!node.position) {
                return
            }

            const startOg = node.position.start.offset
            const endOg = node.position.end.offset

            const strToOperateOn = markdownSource.substring(startOg, endOg)
            const wasUnderscores = strToOperateOn.startsWith('__') && strToOperateOn.endsWith('__')

            if (wasUnderscores) {
                node.type = defaultNodeTypes.underline_mark as MdastNodeType
                node.data = {
                    hName: 'u',
                    hProperties: {},
                }
            }
        })
    }

    return transformer
}

export default remarkUnderline
