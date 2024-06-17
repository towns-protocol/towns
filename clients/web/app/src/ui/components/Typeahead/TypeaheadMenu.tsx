import React, { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { isHotkey } from '@udecode/plate-common'
import { VirtualRef } from '@udecode/plate-floating'
import {
    TYPEAHEAD_POPUP_ID,
    TypeaheadPositionResult,
    getTypeaheadPosition,
} from '@components/RichTextPlate/utils/helpers'
import { Box, BoxProps } from '../Box/Box'

type TypeaheadMenuProps = React.PropsWithChildren<{
    zIndex?: BoxProps['zIndex']
    outerBorder?: boolean
    position?: TypeaheadPositionResult
}>

export const TypeaheadMenu = ({
    children,
    zIndex,
    position,
    outerBorder = true,
}: TypeaheadMenuProps) => {
    if (!position?.bottom) {
        return null
    }

    return (
        <Box border={outerBorder} position="relative" zIndex={zIndex}>
            <Box
                border
                overflow="scroll"
                position="absolute"
                rounded="sm"
                minWidth="250"
                maxWidth="90vw"
                maxHeight="200"
                as="ul"
                paddingY="xs"
                background="level2"
                id={TYPEAHEAD_POPUP_ID}
                tabIndex={0}
                style={{
                    ...(position ? position : {}),
                }}
            >
                {children}
            </Box>
        </Box>
    )
}

interface TypeaheadMenuPortalProps extends TypeaheadMenuProps {
    targetRef: VirtualRef
    noScroll?: boolean
    portalKey: string
}

export const TypeaheadMenuAnchored = ({
    targetRef,
    portalKey,
    noScroll,
    ...props
}: TypeaheadMenuPortalProps) => {
    const typeaheadRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<TypeaheadPositionResult>({})

    useEffect(() => {
        if (!typeaheadRef.current) {
            return
        }
        setPosition(getTypeaheadPosition(targetRef, typeaheadRef.current))
    }, [targetRef, setPosition])

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (noScroll) {
                return
            }
            if (isHotkey('down', e) || isHotkey('up', e)) {
                setTimeout(() => {
                    const highlightedItem = typeaheadRef.current?.querySelector(
                        `ul li[aria-selected="true"]`,
                    ) as HTMLLIElement
                    if (highlightedItem) {
                        highlightedItem.scrollIntoView({
                            block: 'nearest',
                        })
                    }
                }, 0)
            }
        },
        [noScroll],
    )

    useEffect(() => {
        document.addEventListener('keydown', onKeyDown)

        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onKeyDown])

    return createPortal(
        <Box ref={typeaheadRef}>
            <TypeaheadMenu {...props} position={position} />
        </Box>,
        document.getElementById('root') as HTMLElement,
        portalKey,
    )
}
