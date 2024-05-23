import React from 'react'
import { createPortal } from 'react-dom'
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
    portalKey: string
}

export const TypeaheadMenuAnchored = ({
    targetRef,
    portalKey,
    ...props
}: TypeaheadMenuPortalProps) => {
    const typeaheadRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<TypeaheadPositionResult>({})

    React.useEffect(() => {
        if (!typeaheadRef.current) {
            return
        }
        setPosition(getTypeaheadPosition(targetRef, typeaheadRef.current))
    }, [targetRef, setPosition])

    return createPortal(
        <Box ref={typeaheadRef}>
            <TypeaheadMenu {...props} position={position} />
        </Box>,
        document.getElementById('root') as HTMLElement,
        portalKey,
    )
}
