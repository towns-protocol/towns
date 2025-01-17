import React, { ReactNode, useState } from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Icon, IconButton, IconProps, Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

export type Props<T extends IconProps['type'] | undefined = IconProps['type']> = {
    toast: Toast
    icon?: T
    iconProps?: Partial<IconProps>
    imgSrc?: T extends IconProps['type'] ? never : string
    pending?: T extends IconProps['type'] ? never : boolean
    success?: boolean
    message: string | ReactNode
    /**
     * pass a string to display a message that will be truncated to 2 lines - the default, useful for long, raw error messages
     * pass a react node to display a custom message
     */
    subMessage?: string | ReactNode
    cta?: string
    ctaColor?: TextProps['color']
    onCtaClick?: ({ dismissToast }: { dismissToast: () => void }) => void | Promise<void>
    onDismiss?: () => void
    iconAnimation?: JSX.Element
}

export function StandardToast<T extends IconProps['type'] | undefined>(props: Props<T>) {
    const {
        icon,
        iconProps,
        imgSrc,
        message,
        subMessage,
        onDismiss,
        toast,
        cta,
        ctaColor,
        onCtaClick,
        pending,
        iconAnimation,
        success,
    } = props
    const [ctaActionLoading, setCtaActionLoading] = useState(false)
    const _onCtaClick = async () => {
        if (ctaActionLoading) {
            return
        }
        setCtaActionLoading(true)
        await onCtaClick?.({
            dismissToast: () => headlessToast.dismiss(toast.id),
        })
        setCtaActionLoading(false)
    }

    const isUnknownConnectorError =
        typeof subMessage === 'string' && subMessage?.toLowerCase().includes('unknown connector')

    return (
        <Box
            horizontal
            gap
            width={{
                mobile: '300',
                desktop: '390',
            }}
            alignItems="center"
            justifyContent="spaceBetween"
        >
            <Box alignSelf="start">
                {success && iconAnimation ? <Box position="absolute"> {iconAnimation} </Box> : null}
                <Box
                    horizontal
                    gap
                    centerContent
                    width="x4"
                    background="level3"
                    rounded="sm"
                    aspectRatio="1/1"
                >
                    {icon && <Icon shrink={false} {...iconProps} type={icon} size="square_sm" />}
                    {pending && <ButtonSpinner />}
                    {/* todo: style image */}
                    {imgSrc && <img src={imgSrc} alt="notification" />}
                </Box>
            </Box>
            <Box gap grow overflowX="scroll" overflowY="hidden">
                <Box gap="sm">
                    <Box>{message}</Box>
                    {isUnknownConnectorError && (
                        <Box>(UC) Please try logging out and in again.</Box>
                    )}

                    {subMessage && !isUnknownConnectorError && (
                        <Box
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                            color="gray2"
                            fontSize="sm"
                        >
                            {subMessage}
                        </Box>
                    )}
                </Box>
                {cta && (
                    <Box horizontal gap alignItems="center">
                        {ctaActionLoading && <ButtonSpinner />}
                        <Box
                            cursor="pointer"
                            opacity={ctaActionLoading ? '0.5' : 'opaque'}
                            disabled={ctaActionLoading}
                            onClick={_onCtaClick}
                        >
                            <Text color={ctaColor}>{cta}</Text>
                        </Box>
                    </Box>
                )}
            </Box>
            <Box alignSelf="start">
                {!pending && (
                    <IconButton
                        alignSelf="center"
                        shrink={false}
                        size="square_sm"
                        icon="close"
                        color="default"
                        paddingTop="none"
                        onClick={() => {
                            onDismiss?.()
                            headlessToast.dismiss(toast.id)
                        }}
                    />
                )}
            </Box>
        </Box>
    )
}

StandardToast.Success = (props: Props) => (
    <StandardToast icon="check" iconProps={{ color: 'positive' }} ctaColor="positive" {...props} />
)

StandardToast.Error = (props: Props) => (
    <StandardToast icon="alert" iconProps={{ color: 'error' }} ctaColor="negative" {...props} />
)

StandardToast.Pending = (props: Props<undefined>) => <StandardToast pending {...props} />

export function dismissToast(toastId: string) {
    headlessToast.dismiss(toastId)
}
