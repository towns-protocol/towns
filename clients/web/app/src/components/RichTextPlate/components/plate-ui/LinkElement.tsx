import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, useElement } from '@udecode/plate-common'
import { TLinkElement, useLink } from '@udecode/plate-link'
import { Box } from '@ui'
import { link } from '../../RichTextEditor.css'

export const LinkElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        const element = useElement<TLinkElement>()
        const { props: linkProps } = useLink({ element })

        return (
            <PlateElement asChild ref={ref} {...(linkProps as Record<never, never>)} {...props}>
                <Box as="a" className={link} display="inline-block">
                    {children}
                </Box>
            </PlateElement>
        )
    },
)
