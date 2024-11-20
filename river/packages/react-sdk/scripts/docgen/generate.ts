import * as model from '@microsoft/api-extractor-model'
import * as fs from 'node:fs'

import { renderApiFunction } from './render/functions'
import { type ModuleItem } from './render/module-types'
import { createDataLookup, getId } from './utils/model'
import { resolve } from 'node:path'

const config = {
    projectName: 'react-sdk',
    pagesDir: '../../../docs/sdk/react-sdk',
    mintlifyJson: '../../../docs/mint.json',
}
export type DocgenConfig = typeof config

console.log('Generating API docs.')

////////////////////////////////////////////////////////////
/// Load API Model and construct lookup
////////////////////////////////////////////////////////////
const fileName = `./${config.projectName}.api.json`
const filePath = resolve(import.meta.dirname, fileName)
const apiPackage = new model.ApiModel().loadPackage(filePath)
const dataLookup = createDataLookup(apiPackage)

fs.writeFileSync(resolve(import.meta.dirname, './lookup.json'), JSON.stringify(dataLookup, null, 2))

////////////////////////////////////////////////////////////
/// Get API entrypoint and namespaces
////////////////////////////////////////////////////////////
const apiEntryPoint = apiPackage.members.find(
    (x) => x.kind === model.ApiItemKind.EntryPoint,
) as model.ApiEntryPoint
if (!apiEntryPoint) {
    throw new Error('Could not find api entrypoint')
}

////////////////////////////////////////////////////////////
/// Generate markdown files
////////////////////////////////////////////////////////////

const functionsMap = new Map<
    string,
    {
        description: string | undefined
        link: string
    }
>()

const dir = resolve(import.meta.dirname, `${config.pagesDir}/api/`)
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
}

for (const module of apiEntryPoint.members) {
    const name = module.displayName
    const baseLink = `./api/${name}`
    const functions: ModuleItem[] = []

    const id = getId(module)
    const data = dataLookup[id]
    if (!data) {
        throw new Error(`Could not find data for ${id}`)
    }

    const { description, displayName } = data

    let apiContent = ''
    const typeContent = ''
    if (module.kind === model.ApiItemKind.Function) {
        // Resolve overloads for function
        const overloads = module.getMergedSiblings().map(getId)
        // Skip overloads without TSDoc attached
        if (overloads.length > 1 && overloads.find((x) => dataLookup[x]?.comment?.summary) !== id) {
            continue
        }
        const link = `${baseLink}`
        functions.push({ apiItem: module, description, link })

        apiContent = renderApiFunction({
            apiItem: apiPackage,
            data,
            dataLookup,
            overloads,
        })
    }

    if (functions.length > 0) {
        const content = ['---', `title: ${displayName}`, '---']
        for (const f of functions) {
            if (f.apiItem.displayName !== displayName) {
                content.push(`## ${f.apiItem.displayName}`)
            }
            functionsMap.set(displayName, {
                description: f.description,
                link: f.link,
            })
            content.push(apiContent)
            content.push(typeContent)
        }
        fs.writeFileSync(`${dir}/${displayName}.mdx`, content.join('\n'))
    }
}

console.log('Updating mint.json navigation for React SDK API pages')

// Update mint.json navigation for React SDK API pages
const mintJsonPath = resolve(import.meta.dirname, config.mintlifyJson)
const mintJson = JSON.parse(fs.readFileSync(mintJsonPath, 'utf-8')) as MintJson

type MintJson = {
    navigation: {
        group: string
        pages: Array<
            | string
            | {
                  group?: string
                  pages: string[]
              }
        >
    }[]
}

// Find React SDK navigation group
const reactSdk = mintJson.navigation.find((group) => group.group === 'React SDK')
if (!reactSdk) {
    throw new Error('Could not find React SDK navigation group')
}

// Get list of current API doc files
const apiDocsDir = resolve(import.meta.dirname, `${config.pagesDir}/api/`)
const existingApiFiles = fs
    .readdirSync(apiDocsDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => `sdk/react-sdk/api/${file.replace('.mdx', '')}`)

// Get current API pages from mint.json
const apiGroup = reactSdk.pages.find((page) => typeof page !== 'string' && page.group === 'API') as
    | { group: string; pages: string[] }
    | undefined

const currentApiPages = apiGroup?.pages || []

// Find files that exist in folder but not in mint.json - these should be purged
const filesToDelete = existingApiFiles.filter((file) => !currentApiPages.includes(file))

// Delete the files
for (const file of filesToDelete) {
    const filename = `${apiDocsDir}/${file.split('/').pop()}.mdx`
    console.log(`Deleting unused API doc: ${filename}`)
    fs.rmSync(filename)
}

reactSdk.pages = [
    ...reactSdk.pages.filter((page) => typeof page === 'string'), // add any other pages that arent groups
    ...reactSdk.pages.filter((page) => typeof page !== 'string' && page.group !== 'API'), // add any other groups
    {
        group: 'API',
        pages: Array.from(functionsMap.keys()).map((name) => `sdk/react-sdk/api/${name}`),
    },
]

// Write updated mint.json
fs.writeFileSync(mintJsonPath, JSON.stringify(mintJson, null, 2))

console.log('Done.')
