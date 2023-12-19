type ItemCache = {
    key: string
    el: HTMLDivElement | undefined
    heightRef: { current: HTMLDivElement | null }
    y: number
    height: number
    metadata: {
        isMeasured: boolean
        index: number
    }
}

type ItemCacheMap = { [key: string]: ItemCache | undefined }

type FocusOption = {
    key: string
    align: 'start' | 'end'
    force?: boolean
    sticky?: boolean
    margin?: number
}
