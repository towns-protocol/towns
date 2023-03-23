import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RoomIdentifier } from 'use-zion-client'
import { clsx } from 'clsx'
import { Box, BoxProps, Icon, TooltipRenderer } from '@ui'
import { FadeIn } from '@components/Transitions'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { getInviteUrl } from 'ui/utils/utils'
import {
    TooltipBoxVariants,
    spaceLinkCopy,
    spaceUrlText,
    tooltipBoxStyles,
} from './CopySpaceLink.css'

const MotionBox = motion(Box)

type Props = {
    inviteUrl: string
    copied: boolean
    tooltipTop?: BoxProps['top']
} & TooltipBoxVariants

const SpaceLink = (props: Props) => {
    const { copied, inviteUrl, align, offsetTop } = props
    const [widths, setWidths] = useState([0, 0])

    const copiedTextRef = useRef<HTMLDivElement>(null)
    const spaceUrlTextRef = useRef<HTMLDivElement>(null)
    const [finishedCopy, setFinishedCopy] = useState(false)

    const onAnimationComplete = useCallback(() => {
        if (copied) {
            setTimeout(() => {
                setFinishedCopy(true)
            }, 1000)
        }
    }, [copied])

    // since this is absolutely positioned, we need to calculate the width of the text for animating width
    useLayoutEffect(() => {
        if (!copiedTextRef.current || !spaceUrlTextRef.current) {
            return
        }
        setWidths([
            copiedTextRef.current.getBoundingClientRect().width,
            spaceUrlTextRef.current.getBoundingClientRect().width,
        ])
    }, [])

    const paddingX = 32 // aligns with padding "md"

    return (
        <>
            <MotionBox
                animate={{
                    width: copied ? `${widths[0] + paddingX}px` : `${widths[1] + paddingX}px`,
                    opacity: finishedCopy ? 0 : 1,
                }}
                initial={{
                    opacity: 0,
                }}
                exit={{
                    opacity: 0,
                }}
                transition={{
                    type: 'spring',
                    delay: 0.1,
                    duration: 0.3,
                    bounce: 0.1,
                }}
                className={clsx([
                    tooltipBoxStyles({
                        offsetTop,
                        align,
                    }),
                ])}
                onAnimationComplete={onAnimationComplete}
            >
                <div
                    style={{
                        visibility: 'hidden',
                        overflow: 'hidden',
                        height: 0,
                    }}
                >
                    <span ref={copiedTextRef}>Copied!</span>
                    <div ref={spaceUrlTextRef} className={spaceLinkCopy}>
                        Copy town link
                    </div>
                </div>

                {widths[0] !== 0 && (
                    <Box>
                        {copied && <FadeIn delay>Copied!</FadeIn>}{' '}
                        {!copied && <span className={spaceLinkCopy}>Copy town link</span>}
                    </Box>
                )}
            </MotionBox>
        </>
    )
}

export const CopySpaceLink = (
    props: {
        spaceId: RoomIdentifier
        color?: BoxProps['color']
        background?: BoxProps['background']
    } & TooltipBoxVariants,
) => {
    const {
        spaceId,
        color,
        background = {
            default: 'level2',
            hover: 'level3',
        },
        align,
        offsetTop,
    } = props
    const [, copy] = useCopyToClipboard()
    const inviteUrl = getInviteUrl(spaceId)
    const [copyDisplay, setCopyDisplay] = useState(false)

    const onCopyClick = useCallback(() => {
        copy(inviteUrl)
        setCopyDisplay(true)
    }, [copy, inviteUrl])

    const onMouseLeave = useCallback((outFn: () => void) => {
        outFn()
        setCopyDisplay(false)
    }, [])

    return (
        <Box horizontal>
            <TooltipRenderer
                keepOpenOnTriggerRefClick
                trigger="hover"
                placement="vertical"
                render={
                    <SpaceLink
                        copied={copyDisplay}
                        inviteUrl={inviteUrl}
                        align={align}
                        offsetTop={offsetTop}
                    />
                }
            >
                {({ triggerProps }) => (
                    <Box
                        {...triggerProps}
                        padding="xs"
                        rounded="sm"
                        color={color}
                        background={background}
                        onMouseLeave={() => onMouseLeave(triggerProps.onMouseLeave)}
                        onClick={onCopyClick}
                    >
                        <Icon type="link" size="square_sm" />
                    </Box>
                )}
            </TooltipRenderer>
        </Box>
    )
}
