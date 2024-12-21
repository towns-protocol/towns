import { PropsWithChildren, useEffect, useState } from 'react'
import pixelFont from './assets/pixelfont.ttf'
import { PixelFontFamily } from './PointsPanelConstants'

const font = new FontFace(PixelFontFamily, `url(${pixelFont})`)
document.fonts.add(font)

export const PixelFontLoader = (props: PropsWithChildren) => {
    const [loaded, setLoaded] = useState(() => {
        return font.status === 'loaded'
    })
    useEffect(() => {
        font.load()
        font.loaded.then(() => {
            console.log('[river-points] font loaded')
            setLoaded(true)
        })
    }, [])

    if (!loaded) {
        return null
    }

    return props.children
}
