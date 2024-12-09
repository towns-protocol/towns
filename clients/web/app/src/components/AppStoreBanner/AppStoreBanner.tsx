import React, { useMemo, useState } from 'react'
import { Box, BoxProps, Icon, Paragraph } from '@ui'
import { TOWNS_IOS_APP } from 'data/links'
import { isIOS, isMacOS, isSafari } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { Analytics } from 'hooks/useAnalytics'

const BANNER_PRESENTATION_LIMIT = 3
export const AppStoreBanner = (props: BoxProps) => {
    const { setAppStoreBannerPresentedCount, appStoreBannerPresentedCount } = useStore()
    const [didDismiss, setDidDismiss] = useState(false) // only dismiss once per session

    const onDismiss = () => {
        Analytics.getInstance().track('clicked dismiss app store banner')
        setDidDismiss(true)
        setAppStoreBannerPresentedCount(appStoreBannerPresentedCount + 1)
    }
    const onOpen = () => {
        Analytics.getInstance().track('clicked app store banner')
        window.open(TOWNS_IOS_APP)
    }

    const display = useMemo(() => {
        if (appStoreBannerPresentedCount >= BANNER_PRESENTATION_LIMIT) {
            return false
        }
        if (didDismiss) {
            return false
        }
        return isMacOS() || (isIOS() && !isSafari())
    }, [appStoreBannerPresentedCount, didDismiss])

    if (!display) {
        return <></>
    }

    return (
        <Box {...props}>
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
                <Box width="x2" cursor="pointer" onClick={onDismiss}>
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
                <Box grow gap="sm" cursor="pointer" onClick={onOpen}>
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
                        cursor="pointer"
                    >
                        <Paragraph size="xs" textTransform="uppercase">
                            Use app
                        </Paragraph>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
