import { AutoformatRule } from '@udecode/plate-autoformat'
import { BlockquotePlugin } from '@udecode/plate-block-quote/react'
import { CodeBlockPlugin } from '@udecode/plate-code-block/react'

import { formatCodeBlock, isParagraph, preFormat } from './utils'

export const autoformatBlocks: AutoformatRule[] = [
    {
        mode: 'block',
        type: BlockquotePlugin.key,
        match: '> ',
        query: isParagraph,
        preFormat,
    },
    {
        mode: 'block',
        type: CodeBlockPlugin.key,
        match: '```',
        triggerAtBlockStart: false,
        query: isParagraph,
        preFormat,
        format: formatCodeBlock,
    },
]
