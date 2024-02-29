import React from 'react'
import { cn, withRef } from '@udecode/cn'
import { useCodeBlockElementState } from '@udecode/plate-code-block'
import { PlateElement } from '@udecode/plate-common'

export const CodeBlockElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        const { element } = props
        const state = useCodeBlockElementState({ element })

        return (
            <PlateElement
                ref={ref}
                className={cn('tw-relative tw-py-1', state.className, className)}
                {...props}
            >
                <pre className="tw-overflow-x-auto tw-rounded-md tw-bg-muted tw-px-6 tw-py-8 tw-font-mono tw-text-sm tw-leading-[normal] [tab-size:tw-2]">
                    <code>{children}</code>
                </pre>
            </PlateElement>
        )
    },
)
