import React, { useMemo } from 'react'
import { Box, Icon, Paragraph } from '@ui'
import { TOWNS_IOS_APP } from 'data/links'
import { isIOS, isSafari } from 'hooks/useDevice'
import { useStore } from 'store/store'

export const AppStoreBanner = () => {
    const { setAppStoreBanner, appStoreBanner } = useStore()
    const onDismiss = () => {
        setAppStoreBanner(false)
    }
    const onOpen = () => {
        window.open(TOWNS_IOS_APP)
    }

    const display = useMemo(() => {
        return appStoreBanner && isIOS() && !isSafari()
    }, [appStoreBanner])

    if (!display) {
        return <></>
    }

    return (
        <Box
            horizontal
            paddingY
            paddingX="sm"
            gap="sm"
            width="100%"
            height="x8"
            background="level2"
            alignItems="center"
        >
            <Box width="x2" onClick={onDismiss}>
                <Icon type="close" size="square_xs" />
            </Box>
            <Box
                width="x5"
                height="x5"
                padding="sm"
                background="level1"
                overflow="hidden"
                borderRadius="sm"
            >
                <Box
                    grow
                    style={{
                        backgroundImage: 'url(/t.svg)',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'none',
                    }}
                />
            </Box>
            <Box grow gap="sm" onClick={onOpen}>
                <Paragraph fontWeight="medium" color="default">
                    Towns
                </Paragraph>
                <Paragraph size="sm">Permissionless Group Chat</Paragraph>
            </Box>
            <Box onClick={onOpen}>
                <Box
                    background="cta2"
                    color="default"
                    padding="sm"
                    borderRadius="lg"
                    fontWeight="medium"
                >
                    <Paragraph size="xs" textTransform="uppercase">
                        Use app
                    </Paragraph>
                </Box>
            </Box>
        </Box>
    )
}
