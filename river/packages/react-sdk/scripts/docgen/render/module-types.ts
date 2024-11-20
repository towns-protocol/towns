import * as model from '@microsoft/api-extractor-model'

import { type Data, getId } from '../utils/model.js'

export type ModuleItem = {
    apiItem: model.ApiItem
    description: string
    link: string
}

export function renderModuleTypes(options: {
    dataLookup: Record<string, Data>
    types: ModuleItem[]
    name: string
}) {
    const { dataLookup, name, types } = options
    const content = ['---\nshowOutline: 1\n---', `# ${name} Types`]

    for (const type of types) {
        const { apiItem } = type
        const id = getId(apiItem)
        const data = dataLookup[id]
        if (!data) {
            throw new Error(`Could not find type data for ${id}`)
        }

        const name = apiItem.parent?.displayName
            ? `${apiItem.parent.displayName}.${data.displayName}`
            : data.displayName

        content.push(`## \`${name}\``)
        content.push(data.comment?.summary ?? '')
        content.push(`\`${data.type}\``)
        if (data.comment?.examples?.length) {
            content.push('### Examples')
            for (const example of data.comment?.examples ?? []) {
                content.push(example)
            }
        }
        content.push(
            `**Source:** [${data.displayName}](${data.file.url}${
                data.file.lineNumber ? `#L${data.file.lineNumber}` : ''
            })`,
        )
    }

    return content.join('\n\n')
}
