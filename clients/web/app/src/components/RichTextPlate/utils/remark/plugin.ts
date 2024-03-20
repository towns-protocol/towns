import { Processor } from 'unified'
import { MdastNode, OptionType } from './ast-types'
import transform from './deserialize'

export default function plugin(this: Processor, opts?: OptionType) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.Compiler = (node: { children: Array<MdastNode> }) => {
        return node.children.map((c) => transform(c, opts))
    }
}
