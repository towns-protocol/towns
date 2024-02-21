import React from 'react'
import { cn, withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'

export const BlockquoteElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <PlateElement
                asChild
                ref={ref}
                className={cn('tw-my-1 tw-border-l-2 tw-pl-6 tw-italic', className)}
                {...props}
            >
                <blockquote>{children}</blockquote>
            </PlateElement>
        )
    },
)
