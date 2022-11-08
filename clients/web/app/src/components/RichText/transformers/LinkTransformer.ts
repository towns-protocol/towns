import { $createLinkNode } from '@lexical/link'
import { LINK, TextMatchTransformer } from '@lexical/markdown'
import { $createTextNode } from 'lexical'

export const BLANK_LINK: TextMatchTransformer = {
    ...LINK,
    replace: (textNode, match) => {
        const [, linkText, linkUrl] = match
        const linkNode = $createLinkNode(linkUrl, { target: '_blank', rel: 'noopener' })
        const linkTextNode = $createTextNode(linkText)
        linkTextNode.setFormat(textNode.getFormat())
        linkNode.append(linkTextNode)
        textNode.replace(linkNode)
    },
}
