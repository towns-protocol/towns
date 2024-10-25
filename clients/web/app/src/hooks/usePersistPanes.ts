import { useCallback, useMemo } from 'react'
import { useStore } from 'store/store'

export const usePersistPanes = (config: string[]) => {
    const { sizes, setPaneSize } = useStore((state) => ({
        sizes: state.paneSizes,
        setPaneSize: state.setPaneSize,
    }))

    const onSizesChange = useCallback(
        (sizes: number[]) => {
            if (sizes.length === config.length) {
                sizes.forEach((size, index) => size > 0 && setPaneSize(config[index], size))
            }
        },
        [config, setPaneSize],
    )

    const mappedSizes = useMemo(() => config.map((c) => sizes[c] ?? 0) || [], [sizes, config])

    return {
        onSizesChange,
        sizes: mappedSizes,
    }
}
