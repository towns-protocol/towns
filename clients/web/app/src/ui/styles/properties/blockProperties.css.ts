import { defineProperties } from '@vanilla-extract/sprinkles'
import { vars } from '../vars.css'

export const blockProperties = defineProperties({
    properties: {
        position: {
            relative: 'relative',
            absolute: 'absolute',
            absoluteFill: {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
            absoluteCenter: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            },
            topLeft: {
                position: 'absolute',
                top: 0,
                left: 0,
            },
            topRight: {
                position: 'absolute',
                top: 0,
                right: 0,
            },
            bottomLeft: {
                position: 'absolute',
                bottom: 0,
                left: 0,
            },
            bottomRight: {
                position: 'absolute',
                bottom: 0,
                right: 0,
            },

            fixed: 'fixed',
            static: 'static',
            sticky: 'sticky',
        },
        top: vars.space,
        bottom: vars.space,
        left: vars.space,
        right: vars.space,
        overflowX: {
            hidden: {
                overflowX: 'hidden',
            },
            visible: {
                overflowX: 'visible',
            },
            auto: {
                overflowX: 'auto',
            },
            scroll: {
                overflowX: 'scroll',
                ['::-webkit-scrollbar']: { display: 'none' },
                scrollbarWidth: 'none',
            },
        },

        overflowY: {
            hidden: {
                overflowY: 'hidden',
            },
            visible: {
                overflowY: 'visible',
            },
            auto: {
                overflowY: 'auto',
            },
            scroll: {
                overflowY: 'scroll',
                ['::-webkit-scrollbar']: { display: 'none' },
                scrollbarWidth: 'none',
            },
        },
        cursor: [
            'auto',
            'default',
            'none',
            'context-menu',
            'help',
            'pointer',
            'progress',
            'wait',
            'cell',
            'crosshair',
            'text',
            'vertical-text',
            'alias',
            'copy',
            'move',
            'no-drop',
            'not-allowed',
            'all-scroll',
            'col-resize',
            'row-resize',
            'n-resize',
            'e-resize',
            's-resize',
            'w-resize',
            'ns-resize',
            'ew-resize',
            'ne-resize',
            'nw-resize',
            'se-resize',
            'sw-resize',
            'nesw-resize',
            'nwse-resize',
            'zoom-in',
            'zoom-out',
        ],
    },
    shorthands: {
        overflow: ['overflowX', 'overflowY'],
    },
})
