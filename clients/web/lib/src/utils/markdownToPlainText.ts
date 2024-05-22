import { Marked } from 'marked'
import markedPlaintify from 'marked-plaintify'

export const markdownToPlainText = (text?: string) => {
    if (!text || typeof text !== 'string') {
        return ''
    }

    return new Marked({ gfm: true }).use(markedPlaintify()).parse(text, { async: false }) as string
}
