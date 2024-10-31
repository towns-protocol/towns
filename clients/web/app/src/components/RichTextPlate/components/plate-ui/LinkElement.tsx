import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, useElement } from '@udecode/plate-common/react'
import { useLink } from '@udecode/plate-link/react'
import { TLinkElement } from '@udecode/plate-link'
import { Link } from 'react-router-dom'
import { Box } from '@ui'
import { useMessageLink } from '@components/MessageTimeline/hooks/useFocusItem'
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

export const LinkWithoutPlate = React.forwardRef<
    HTMLAnchorElement,
    React.PropsWithChildren<{ children?: unknown; href?: string }>
>(({ children, href }, ref) => {
    const messageLink = useMessageLink(href)

    if (messageLink && messageLink.type === 'same-channel-message') {
        return (
            <Box as="a" ref={ref} className={link} onClick={messageLink.focusMessage}>
                {children}
            </Box>
        )
    } else if (messageLink.type === 'internal-link') {
        return (
            <Link ref={ref} to={messageLink.path} className={link}>
                {children}
            </Link>
        )
    } else {
        return (
            <Box as="a" ref={ref} href={messageLink.link} target="_blank" className={link}>
                {children}
            </Box>
        )
    }
})
