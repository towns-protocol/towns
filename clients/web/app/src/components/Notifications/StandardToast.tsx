import React, { useState } from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Icon, IconButton, IconProps, Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

type Props<T extends IconProps['type'] | undefined = IconProps['type']> = {
    toast: Toast
    icon?: T
    iconColor?: IconProps['color']
    imgSrc?: T extends IconProps['type'] ? never : string
    pending?: T extends IconProps['type'] ? never : boolean
    message: string
    cta?: string
    ctaColor?: TextProps['color']
    onCtaClick?: ({ dismissToast }: { dismissToast: () => void }) => void | Promise<void>
    onDismiss?: () => void
}

export function StandardToast<T extends IconProps['type'] | undefined>(props: Props<T>) {
    const {
        icon,
        iconColor,
        imgSrc,
        message,
        onDismiss,
        toast,
        cta,
        ctaColor,
        onCtaClick,
        pending,
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
    return (
        <Box horizontal gap width="390" alignItems="center" justifyContent="spaceBetween">
            <Box alignSelf="start">
                <Box
                    horizontal
                    gap
                    centerContent
                    width="x4"
                    background="level3"
                    rounded="sm"
                    aspectRatio="1/1"
                >
                    {icon && <Icon shrink={false} color={iconColor} type={icon} size="square_sm" />}
                    {pending && <ButtonSpinner />}
                    {/* todo: style image */}
                    {imgSrc && <img src={imgSrc} alt="notification" />}
                </Box>
            </Box>
            <Box gap grow>
                <Text>{message}</Text>
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
    <StandardToast icon="check" iconColor="positive" ctaColor="positive" {...props} />
)

StandardToast.Error = (props: Props) => (
    <StandardToast icon="alert" iconColor="error" ctaColor="positive" {...props} />
)

StandardToast.Pending = (props: Props<undefined>) => <StandardToast pending {...props} />
