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
                <LinkWithoutPlate href={linkProps.href}>{children}</LinkWithoutPlate>
            </PlateElement>
        )
    },
)

export const LinkWithoutPlate = ({
    children,
    href,
}: React.PropsWithChildren<{ children?: unknown; href?: string }>) => {
    return (
        <Box as="a" href={href} target="_blank" className={link} display="inline-block">
            {children}
        </Box>
    )
}
