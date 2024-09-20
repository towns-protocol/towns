import { AutoformatRule } from '@udecode/plate-autoformat'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_CODE_BLOCK } from '@udecode/plate-code-block'

import { formatCodeBlock, isParagraph, preFormat } from './utils'

export const autoformatBlocks: AutoformatRule[] = [
    {
        mode: 'block',
        type: ELEMENT_BLOCKQUOTE,
        match: '> ',
        query: isParagraph,
        preFormat,
    },
    {
        mode: 'block',
        type: ELEMENT_CODE_BLOCK,
        match: '```',
        triggerAtBlockStart: false,
        query: isParagraph,
        preFormat,
        format: formatCodeBlock,
    },
]
