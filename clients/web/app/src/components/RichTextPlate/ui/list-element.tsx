import React from 'react'
import { withRef, withVariants } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { cva } from 'class-variance-authority'

const listVariants = cva('tw-m-0 tw-ps-6', {
    variants: {
        variant: {
            ul: 'tw-list-disc [&_ul]:tw-list-[circle] [&_ul_ul]:tw-list-[square]',
            ol: 'tw-list-decimal',
        },
    },
})

const ListElementVariants = withVariants(PlateElement, listVariants, ['variant'])

export const ListElement = withRef<typeof ListElementVariants>(
    ({ children, variant = 'ul', ...props }, ref) => {
        const Component = variant!

        return (
            <ListElementVariants asChild ref={ref} variant={variant} {...props}>
                <Component>{children}</Component>
            </ListElementVariants>
        )
    },
)
