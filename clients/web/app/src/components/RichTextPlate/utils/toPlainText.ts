import { TNode, getNodeString } from '@udecode/slate'

export const toPlainText = (nodes: TNode[]) => {
    return nodes.map((n) => getNodeString(n)).join('\n')
}
