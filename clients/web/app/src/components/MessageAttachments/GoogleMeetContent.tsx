import React from 'react'
import { Box, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { UnfurledLinkAttachment } from '@towns-protocol/sdk'

export const GoogleMeetContent = (props: {
    attachment: UnfurledLinkAttachment & { dialInLink?: string }
}) => {
    const { attachment } = props
    const { url, title, description, dialInLink } = attachment

    let meetingCode = ''
    try {
        const meetUrl = new URL(url)
        meetingCode = meetUrl.pathname.split('/')[1] || ''
    } catch (e) {}

    let phoneNumber = ''
    if (dialInLink) {
        try {
            const telUrl = new URL(dialInLink)
            const parts = telUrl.pathname.split('/')
            if (parts.length > 2) {
                phoneNumber = parts[2]
                if (phoneNumber.length === 10) {
                    phoneNumber = `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
                        3,
                        6,
                    )}-${phoneNumber.slice(6)}`
                }
            }
        } catch (e) {}
    }

    return (
        <Box
            as="a"
            href={url}
            rel="noopener noreferrer"
            target="_blank"
            position="relative"
            width="100%"
        >
            <Box
                horizontal
                gap="sm"
                background="level2"
                borderRadius="md"
                padding="paragraph"
                maxWidth="100%"
                alignItems="center"
            >
                {/* Google Meet Logo */}
                <Box
                    shrink={false}
                    width="x8"
                    height="x8"
                    style={{
                        backgroundImage: `url('/meet-logo-small.svg')`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                />

                {/* Content */}
                <Stack gap="xs" overflow="hidden">
                    <Heading level={3} color="default" whiteSpace="normal">
                        {title || 'Google Meet'}
                    </Heading>

                    {description && (
                        <Paragraph color="gray2" size="sm">
                            {description}
                        </Paragraph>
                    )}

                    {/* Meeting Code and Dial-in Info */}
                    <Box horizontal gap="sm" alignItems="center">
                        {meetingCode && (
                            <Box
                                background="lightHover"
                                borderRadius="md"
                                paddingY="xxs"
                                paddingX="xs"
                            >
                                <Text size="sm" color="gray1">
                                    {meetingCode}
                                </Text>
                            </Box>
                        )}

                        {phoneNumber && (
                            <Box horizontal gap="xxs" alignItems="center">
                                <Icon type="phone" size="square_xs" color="gray1" />
                                <Text size="sm" color="gray1">
                                    {phoneNumber}
                                </Text>
                            </Box>
                        )}
                    </Box>
                </Stack>
            </Box>
        </Box>
    )
}
