import React, { ComponentProps, useCallback } from 'react'
import { IconButton } from '@ui'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { GiphyPicker } from './GiphyPicker'
import { GiphySearchContextProvider, useGiphySearchContext } from './GiphySearchContext'

type Props = ComponentProps<typeof GiphyPicker>

// TODO: not sure why this causes whole Timeline to rerender
// const LazyGiphy = React.lazy(() => import('./GiphyPicker'))

export const GiphyContainer = (props: Props) => {
    const { setIsFetching, setOptedIn, setInputValue } = useGiphySearchContext()
    const onClick = (
        e: React.MouseEvent,
        clickCb: ((e: React.MouseEvent<Element, MouseEvent>) => void) | undefined,
    ) => {
        setIsFetching(true)
        setOptedIn(true)
        clickCb && clickCb(e)
    }

    const onCardClose = useCallback(() => {
        setInputValue('')
    }, [setInputValue])

    return (
        <CardOpener placement="vertical" render={<GiphyPicker {...props} />} onClose={onCardClose}>
            {({ triggerProps: { onClick: clickCb, ...rest } }) => (
                <IconButton
                    icon="gif"
                    alignSelf="start"
                    onClick={(e) => onClick(e, clickCb)}
                    {...rest}
                />
            )}
        </CardOpener>
    )
}

export const GiphyEntry = (props: Props) => {
    return (
        <GiphySearchContextProvider>
            <GiphyContainer {...props} />
        </GiphySearchContextProvider>
    )
}
