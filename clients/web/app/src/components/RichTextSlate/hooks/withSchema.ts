/* eslint no-param-reassign: 0 */
import { CustomEditor } from '@components/RichTextSlate/slate-types'
import { INLINES, VOIDS } from '../utils/schema'

const withSchema = (editor: CustomEditor) => {
    const { isVoid, isInline } = editor
    editor.isInline = (element) => INLINES[element.type] || isInline(element)
    editor.isVoid = (element) => VOIDS[element.type] || isVoid(element)

    return editor
}

export default withSchema
