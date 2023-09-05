import React, { ComponentProps, useCallback } from 'react'
import Sheet from 'react-modal-sheet'
import { Box, IconButton, useZLayerContext } from '@ui'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { GiphyPicker, GiphyPickerCard } from './GiphyPicker'
import { GiphySearchContextProvider, useGiphySearchContext } from './GiphySearchContext'

type Props = ComponentProps<typeof GiphyPicker>

// TODO: not sure why this causes whole Timeline to rerender
// const LazyGiphy = React.lazy(() => import('./GiphyPicker'))

export const GiphySheet = (props: Props & { showButton: boolean }) => {
    const { setIsFetching, setOptedIn, setInputValue } = useGiphySearchContext()
    const [sheetVisible, setSheetVisible] = React.useState(false)
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined

    const onClick = useCallback(() => {
        setIsFetching(true)
        setSheetVisible(true)
        setOptedIn(true)
    }, [setIsFetching, setSheetVisible, setOptedIn])

    const onCardClose = useCallback(() => {
        setInputValue('')
        setSheetVisible(false)
    }, [setInputValue, setSheetVisible])

    return (
        <>
            {props.showButton && (
                <MotionIconButton
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    icon="gif"
                    alignSelf="start"
                    onClick={onClick}
                />
            )}

            <Sheet
                className={modalSheetClass}
                mountPoint={mountPoint}
                isOpen={sheetVisible}
                onClose={onCardClose}
            >
                <Sheet.Container>
                    <Sheet.Header />
                    <Sheet.Content>
                        <Box maxHeight="100svh" overflow="auto" paddingBottom="safeAreaInsetBottom">
                            <GiphyPickerCard {...props} closeCard={onCardClose} />
                        </Box>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop onTap={onCardClose} />
            </Sheet>
        </>
    )
}

const GiphyCardOpener = (props: Props) => {
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
                    size="square_sm"
                    tooltip="Giphy"
                    tooltipOptions={{ placement: 'vertical', immediate: true }}
                    onClick={(e) => onClick(e, clickCb)}
                    {...rest}
                />
            )}
        </CardOpener>
    )
}

export const GiphyEntryDesktop = (props: Props) => {
    return (
        <GiphySearchContextProvider>
            <GiphyCardOpener {...props} />
        </GiphySearchContextProvider>
    )
}

export const GiphyEntryTouch = (props: Props & { showButton: boolean }) => {
    return (
        <GiphySearchContextProvider>
            <GiphySheet {...props} />
        </GiphySearchContextProvider>
    )
}
