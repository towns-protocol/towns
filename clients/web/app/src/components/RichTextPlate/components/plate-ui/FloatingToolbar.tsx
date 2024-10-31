import React from 'react'
import { withRef } from '@udecode/cn'
import {
    PortalBody,
    useComposedRef,
    useEditorId,
    useEventEditorSelectors,
} from '@udecode/plate-common/react'
import {
    FloatingToolbarState,
    flip,
    offset,
    useFloatingToolbar,
    useFloatingToolbarState,
} from '@udecode/plate-floating'

export const FloatingToolbar = withRef<
    typeof PortalBody,
    {
        children: React.ReactNode
        disabled?: boolean
        portalElement?: Element
        state?: FloatingToolbarState
    }
>(({ state, disabled, portalElement, children, ...props }, componentRef) => {
    const editorId = useEditorId()
    const focusedEditorId = useEventEditorSelectors.focus()

    const floatingToolbarState = useFloatingToolbarState({
        ...state,
        editorId,
        focusedEditorId,
        floatingOptions: {
            placement: 'top-start',
            middleware: [
                offset(0),
                flip({
                    padding: 12,
                    fallbackPlacements: [
                        'top-start',
                        'left-start',
                        'left-end',
                        'bottom-end',
                        'top',
                    ],
                }),
            ],
            ...state?.floatingOptions,
        },
    })

    const { ref: floatingRef, props: rootProps, hidden } = useFloatingToolbar(floatingToolbarState)

    const hideFloatingToolbar = React.useCallback(() => {
        floatingToolbarState.setOpen(false)
    }, [floatingToolbarState])

    React.useEffect(() => {
        if (focusedEditorId !== editorId || disabled) {
            hideFloatingToolbar()
        }
    }, [focusedEditorId, editorId, disabled, hideFloatingToolbar])

    const ref = useComposedRef<HTMLDivElement>(componentRef, floatingRef)

    if (hidden || !editorId || disabled) {
        return null
    }

    return (
        <PortalBody key={`floating-toolbar-${editorId}`}>
            <div ref={ref} {...rootProps} {...props} data-testid="editor-floating-toolbar">
                {children}
            </div>
        </PortalBody>
    )
})
