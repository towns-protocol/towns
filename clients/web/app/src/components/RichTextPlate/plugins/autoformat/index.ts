import { autoformatBlocks } from './blocks'
import { autoformatLists } from './lists'
import { autoformatMarks } from './marks'

export const autoformatRules = [...autoformatBlocks, ...autoformatLists, ...autoformatMarks]
