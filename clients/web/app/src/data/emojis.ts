// https://raw.githubusercontent.com/omnidan/node-emoji/master/lib/emoji.json

import emojisRaw from '@emoji-mart/data/sets/14/native.json'

export const emojis = Object.entries(emojisRaw.emojis).reduce((emojis, e) => {
    const key = e[0]
    const value = e[1]
    emojis[key] = {
        default: value.skins[0].native,
        skins: value.skins.map((skin) => skin.native),
        keywords: value.keywords,
        name: value.name,
    }
    return emojis
}, {} as { [key: string]: { default: string; skins: string[]; keywords: string[]; name: string } })
