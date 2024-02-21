import { Node } from 'slate'

export const toPlainText = (nodes: Node[]) => {
    return nodes.map((n) => Node.string(n)).join('\n')
}
