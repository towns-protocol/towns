import React, { useState } from 'react'
import { useSpaceData } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEvent } from 'react-use-event-hook'
import { Box, Button, Heading, Icon, IconProps, Paragraph, Stack, Text, TextField } from '@ui'
import { StackProps } from 'ui/components/Stack/Stack'
import { PATHS } from 'routes'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { FadeIn } from '@components/Transitions'
import { useSpaceRoles } from 'hooks/useContractRoles'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { getInviteUrl } from 'ui/utils/utils'
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
    const [, copy] = useCopyToClipboard()
    const [copyWasClicked, setCopyWasClicked] = React.useState(false)
    const inviteUrl = getInviteUrl(space?.id)
    const { data: roles } = useSpaceRoles(space?.id.networkId)
    const hasMemberRole = roles?.find((role) => role.name === 'Member')
    const [modal, setModal] = useState(false)

    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    function onCopy() {
        if (copyWasClicked) {
            return
        }
        setCopyWasClicked(true)
        copy(inviteUrl)

        setTimeout(() => {
            setCopyWasClicked(false)
        }, 2000)
    }

    function onChannel() {
        onShow()
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
                        If you’d like to learn more about what we’re doing at Zion, read the{' '}
                        <Link to="//towns.com/vision/" target="_blank">
                            <Text color="cta1" size="lg" display="inline-block">
                                vision
                            </Text>
                        </Link>{' '}
                        and{' '}
                        <Link to="//towns.com/introduction/" target="_blank">
                            <Text color="cta1" size="lg" display="inline-block">
                                introduction
                            </Text>
                        </Link>
                        .
                    </Paragraph>
                </Stack>
                <Stack gap="md" className={childStyle}>
                    <InviteCard
                        flexDirection="column"
                        alignItems="start"
                        icon="link"
                        description="Share your town link:"
                    >
                        <Stack flexDirection="row" flexWrap="wrap" gap="sm" width="100%">
                            <TextField readOnly value={inviteUrl} background="level3" />

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

                    {hasMemberRole && (
                        <InviteCard
                            icon="lock"
                            description="Create a token gated channel"
                            justifyContent="spaceBetween"
                        >
                            <Button width="x10" tone="cta1" onClick={onChannel}>
                                Add
                            </Button>
                        </InviteCard>
                    )}
                </Stack>
            </Stack>

            {modal && space?.id && (
                <ModalContainer onHide={onHide}>
                    <CreateChannelFormContainer spaceId={space.id} onHide={onHide} />
                </ModalContainer>
            )}
        </>
    )
}
