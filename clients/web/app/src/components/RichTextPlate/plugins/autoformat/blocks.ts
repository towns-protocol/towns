import { AutoformatRule } from '@udecode/plate-autoformat'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { ELEMENT_CODE_BLOCK } from '@udecode/plate-code-block'

import { formatCodeBlock, preFormat } from './utils'

export const autoformatBlocks: AutoformatRule[] = [
    {
        mode: 'block',
        type: ELEMENT_BLOCKQUOTE,
        match: '> ',
        preFormat,
    },
    {
        mode: 'block',
        type: ELEMENT_CODE_BLOCK,
        match: '```',
        triggerAtBlockStart: false,
        preFormat,
        format: formatCodeBlock,
    },
]
