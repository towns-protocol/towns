import React, { useState } from 'react'
import { useSpaceData } from 'use-towns-client'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEvent } from 'react-use-event-hook'
import { Box, Button, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { FadeIn } from '@components/Transitions'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { getInviteUrl } from 'ui/utils/utils'
import { copiedStyle } from './SpaceOwnerLanding.css'

export const SpaceOwnerLanding = () => {
    const space = useSpaceData()
    const [, copy] = useCopyToClipboard()
    const [copyWasClicked, setCopyWasClicked] = React.useState(false)
    const inviteUrl = getInviteUrl({ spaceId: space?.id })
    const [modal, setModal] = useState(false)

    const onHide = useEvent(() => {
        setModal(false)
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

    return (
        <Stack padding={{ touch: 'md', default: 'x8' }} maxWidth="600">
            <Stack grow horizontal padding="lg">
                <Heading level={2}>Welcome to {space?.name}</Heading>
            </Stack>
            <Stack padding="lg">
                <Stack gap="lg">
                    <Paragraph size="lg">
                        You now hold the key to your town square. You and your community members can
                        chat freely here and own your communication. You can configure your settings
                        and moderation{' '}
                        <Link to={`/${PATHS.SPACES}/${space?.id}/${PATHS.SETTINGS}`}>
                            <Text color="cta1" size="lg" display="inline-block">
                                here
                            </Text>
                        </Link>
                        .
                    </Paragraph>
                    <Paragraph size="lg">
                        If you’d like to learn more about what we’re doing at Towns, read the{' '}
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

                    <Stack
                        horizontal
                        background="level2"
                        rounded="md"
                        padding="md"
                        justifyContent="spaceBetween"
                        alignItems="center"
                        maxWidth="420"
                        border="default"
                    >
                        <Stack flexDirection="row" gap="md" alignItems="center">
                            <Icon color="gray2" type="link" />
                            <Text color="default">{'Share town link:'}</Text>
                        </Stack>
                        <Box position="relative">
                            <Button tone="cta1" onClick={onCopy}>
                                Copy town link
                            </Button>
                            <AnimatePresence>
                                {copyWasClicked && (
                                    <FadeIn fast>
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
                </Stack>
            </Stack>

            {modal && space?.id && (
                <ModalContainer onHide={onHide}>
                    <CreateChannelFormContainer spaceId={space.id} onHide={onHide} />
                </ModalContainer>
            )}
        </Stack>
    )
}
