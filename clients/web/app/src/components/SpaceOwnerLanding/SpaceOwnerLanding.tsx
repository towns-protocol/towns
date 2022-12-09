import React from 'react'
import { useSpaceData } from 'use-zion-client'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Box, Button, Heading, Icon, IconProps, Paragraph, Stack, Text, TextField } from '@ui'
import { StackProps } from 'ui/components/Stack/Stack'
import { PATHS } from 'routes'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { FadeIn } from '@components/Transitions'
import { childStyle, contentStyle, copiedStyle, headerStyle } from './SpaceOwnerLanding.css'

type InviteCardProps = {
    icon: IconProps['type']
    description: string
    children?: React.ReactNode
} & StackProps

const InviteCard = (props: InviteCardProps) => {
    const { icon, description, children, ...stackProps } = props
    return (
        <Stack
            background="level2"
            rounded="md"
            padding="md"
            gap="md"
            flexDirection="row"
            alignItems="center"
            {...stackProps}
        >
            <Stack flexDirection="row" gap="sm" alignItems="center">
                <Icon type={icon} />
                <Text color="default">{description}</Text>
            </Stack>
            {children}
        </Stack>
    )
}

export const SpaceOwnerLanding = () => {
    const space = useSpaceData()
    const navigate = useNavigate()
    const [, copy] = useCopyToClipboard()
    const [copyWasClicked, setCopyWasClicked] = React.useState(false)
    const HREF = window.location.href

    function onCopy() {
        if (copyWasClicked) return
        setCopyWasClicked(true)
        copy(HREF)

        setTimeout(() => {
            setCopyWasClicked(false)
        }, 2000)
    }

    function onInvite() {
        navigate(`/${PATHS.SPACES}/${space?.id.slug}/${PATHS.SETTINGS}`)
    }

    function onChannel() {
        navigate(`/${PATHS.SPACES}/${space?.id.slug}/${PATHS.CHANNELS}/new`)
    }

    return (
        <>
            <Stack grow horizontal padding="lg" className={headerStyle}>
                <Heading level={1}>Welcome to {space?.name}</Heading>
            </Stack>
            <Stack className={contentStyle}>
                <Stack className={childStyle} gap="lg">
                    <Paragraph size="lg">
                        You now hold the key to your town square. You and your community members can
                        chat freely here and own your communication. You can configure your settings
                        and moderation{' '}
                        <Link to={`/${PATHS.SPACES}/${space?.id.slug}/${PATHS.SETTINGS}`}>
                            <Text color="cta1" size="lg" display="inline-block">
                                here
                            </Text>
                        </Link>
                        .
                    </Paragraph>
                    <Paragraph size="lg">
                        If you’d like to learn more about what we’re doing at Zion, read our{' '}
                        <Link to="#" target="_blank">
                            <Text color="cta1" size="lg" display="inline-block">
                                manifesto
                            </Text>
                        </Link>{' '}
                        and{' '}
                        <Link to="#" target="_blank">
                            <Text color="cta1" size="lg" display="inline-block">
                                how it works.
                            </Text>
                        </Link>{' '}
                    </Paragraph>
                </Stack>
                <Stack gap="md" className={childStyle}>
                    {/* TODO: hide this on everyone spaces https://linear.app/hnt-labs/issue/HNT-513/update-contract-to-provide-prop-for-whether-a-space-is-gated*/}
                    <InviteCard
                        icon="personAdd"
                        description="Add members via wallet address"
                        justifyContent="spaceBetween"
                    >
                        <Button width="x10" tone="cta1" onClick={onInvite}>
                            Add
                        </Button>
                    </InviteCard>
                    {/* --------------------------------- */}

                    <InviteCard
                        flexDirection="column"
                        alignItems="start"
                        icon="link"
                        description="Invite members via wallet address"
                    >
                        <Stack flexDirection="row" flexWrap="wrap" gap="sm" width="100%">
                            <TextField readOnly value={HREF} background="level3" />

                            <Box position="relative">
                                <Button width="x10" tone="cta1" onClick={onCopy}>
                                    Copy
                                </Button>
                                <AnimatePresence mode="wait">
                                    {copyWasClicked && (
                                        <FadeIn>
                                            <Box
                                                position="absolute"
                                                background="level4"
                                                rounded="sm"
                                                padding="sm"
                                                className={copiedStyle}
                                            >
                                                <Text size="sm">Copied!</Text>
                                            </Box>
                                        </FadeIn>
                                    )}
                                </AnimatePresence>
                            </Box>
                        </Stack>
                    </InviteCard>

                    {/* TODO: hide this on token gated spaces */}
                    <InviteCard
                        icon="lock"
                        description="Create a token gated channel"
                        justifyContent="spaceBetween"
                    >
                        <Button width="x10" tone="cta1" onClick={onChannel}>
                            Add
                        </Button>
                    </InviteCard>
                </Stack>
            </Stack>
        </>
    )
}
