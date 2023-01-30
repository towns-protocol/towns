export type ItemSize = {
    isMeasured: boolean
    height: number
    y?: number
}

export type ItemCacheMap = Map<string, ItemSize>
