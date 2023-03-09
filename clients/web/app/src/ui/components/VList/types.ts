export type ItemSize = {
    isMeasured: boolean
    height: number
    maxHeight: number
    y?: number
}

export type ItemCacheMap = Map<string, ItemSize>
