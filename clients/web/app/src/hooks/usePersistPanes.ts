import { useCallback } from 'react'
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

    return {
        onSizesChange,
        sizes: config.map((c) => sizes[c] ?? 0) || [],
    }
}
