import React, { RefObject, useCallback, useMemo, useRef } from 'react'
import { useSpaceData, useSpaceId } from 'use-towns-client'
import { Link } from 'react-router-dom'
import { Box, IconButton, MotionBox, Paragraph, Stack, Text } from '@ui'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { TownsToken } from '@components/TownsToken/TownsToken'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'

const PROFILE_BORDER_WIDTH = 2

export const MintAnimation = (props: {
    targetRef: RefObject<HTMLElement>
    info: { spaceId: string; isOwner: boolean }
}) => {
    const { targetRef, info } = props
    const { setRecentlyMintedSpaceToken } = useStore()

    const spaceData = useSpaceData()
    const { createLink: createProfileLink } = useCreateLink()
    const link = createProfileLink({ profileId: 'me' })
    const [shouldAnimate, setShouldAnimate] = React.useState(false)
    const fromRef = useRef<HTMLElement>(null)
    const targetRect = targetRef?.current?.getBoundingClientRect()
    const sourceRect = fromRef?.current?.getBoundingClientRect()

    const animationValues = useMemo(() => {
        const targetPos = targetRect ? { x: targetRect.x, y: targetRect.y } : undefined
        const sourcePos = sourceRect ? { x: sourceRect.x, y: sourceRect.y } : undefined

        const translate =
            sourcePos && targetPos
                ? {
                      x: sourcePos.x - targetPos.x + 12,
                      y: sourcePos.y - targetPos.y + 12,
                  }
                : undefined

        const targetCenter = targetRect
            ? {
                  x: targetRect.x + targetRect.width / 2,
                  y: targetRect.y + targetRect.height / 2,
              }
            : undefined

        return { translate, targetCenter }
    }, [targetRect, sourceRect])

    const spaceId = useSpaceId()
    const { imageSrc } = useImageSource(spaceId ?? '', ImageVariants.thumbnail100)
    const { isTouch } = useDevice()

    const onAnimationFinished = useCallback(() => {
        setRecentlyMintedSpaceToken(undefined)
    }, [setRecentlyMintedSpaceToken])

    const onClose = useCallback(() => {
        setShouldAnimate(true)
    }, [setShouldAnimate])

    return (
        <Box absoluteFill zIndex="uiAbove" pointerEvents="none">
            {!shouldAnimate && (
                <Stack
                    horizontal
                    border
                    padding="sm"
                    position="absolute"
                    bottom={isTouch ? undefined : 'x4'}
                    top={isTouch ? 'lg' : undefined}
                    right={isTouch ? 'sm' : 'x4'}
                    left={isTouch ? 'sm' : undefined}
                    rounded="sm"
                    background="level2"
                    maxWidth={isTouch ? '100%' : '400'}
                    pointerEvents="auto"
                >
                    <Stack horizontal alignItems="center" gap="sm">
                        <Box ref={fromRef}>
                            <TownsToken
                                size="xxs"
                                imageSrc={imageSrc}
                                spaceName={spaceData?.name}
                            />
                        </Box>
                        <Paragraph size="md" color="default" fontWeight="medium">
                            {info.isOwner
                                ? `You've minted a founder token for ${
                                      spaceData?.name ?? ''
                                  } to your`
                                : `You've minted a membership for ${
                                      spaceData?.name ?? ''
                                  } to your`}{' '}
                            <Link to={link ?? ''}>
                                <Text size="md" color="cta2" display="inline-block">
                                    Towns wallet
                                </Text>
                            </Link>
                            .
                        </Paragraph>
                        <Box height="100%" paddingTop="xs">
                            <IconButton icon="close" onClick={onClose} />
                        </Box>
                    </Stack>
                </Stack>
            )}
            {animationValues.translate && animationValues.targetCenter && shouldAnimate && (
                <AnimatedToken
                    translate={animationValues.translate}
                    targetCenter={animationValues.targetCenter}
                    imageSrc={imageSrc}
                    targetRect={targetRect}
                    onAnimationFinished={onAnimationFinished}
                />
            )}
        </Box>
    )
}

const AnimatedToken = (props: {
    translate: { x: number; y: number }
    targetCenter: { x: number; y: number }
    targetRect?: DOMRect
    imageSrc: string
    onAnimationFinished: () => void
}) => {
    const [shouldAnimateOut, setShouldAnimateOut] = React.useState(false)
    const translationAnimationFinished = useCallback(() => {
        setShouldAnimateOut(true)
    }, [setShouldAnimateOut])
    const { translate, targetCenter, imageSrc, targetRect, onAnimationFinished } = props

    // This entire animation is completely ad hoc and not reusable for anything else
    // It's a custom animation for the minting of a token as it transitions from the toast
    // to the wallet icon in the header

    // Modified easeOutBack from https://easings.net/#easeInOutBack
    function ease(x: number): number {
        const c1 = 1.2
        const c2 = c1 * 1.1
        return x < 0.5
            ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
            : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2
    }

    // dx/dy is the distance from the source to the target
    const dx = translate.x
    const dy = translate.y

    // total duration for the animation
    const duration = 1.5

    // At which keyframe do we start scaling down the token
    const scaleDownThreshold = 15
    const scaleUpFactor = 0.2

    // Calculate angle from the target position to the source position
    // add/subtract PI/2 if needed to make the angle point in the right direction
    // we only want some rotation, not spinning
    const angle = Math.atan2(dy, dx) + (dy < 0 ? Math.PI / 2 : -Math.PI / 2)

    // Generate keyframes for animation, store in array
    const transforms: string[] = []
    // previous position is used to calculate the current speed of the object
    let prev = { x: dx, y: dy }

    const KEYFRAME_COUNT = 20
    for (let i = 0; i <= KEYFRAME_COUNT; i++) {
        const val = 1 - ease(i / KEYFRAME_COUNT)

        const x = dx * val
        const y = dy * val

        // We're using the velocity of the object to scale it up/down
        // to create a more natural looking animation with a squishy effect
        const vx = Math.abs(x - prev.x)
        const vy = Math.abs(y - prev.y)

        const scaleY =
            i < scaleDownThreshold
                ? 1.0 + (scaleUpFactor * vy) / KEYFRAME_COUNT
                : (KEYFRAME_COUNT - i) / (KEYFRAME_COUNT - scaleDownThreshold)
        const scaleX =
            i < scaleDownThreshold
                ? 1.0 + (scaleUpFactor * vx) / KEYFRAME_COUNT
                : (KEYFRAME_COUNT - i) / (KEYFRAME_COUNT - scaleDownThreshold)

        transforms.push(
            `translateX(${x}px) translateY(${y}px) rotateZ(${
                angle * (i / KEYFRAME_COUNT)
            }rad) scaleY(${scaleY}) scaleX(${scaleX})`,
        )
        prev = { x, y }
    }

    return (
        <>
            {targetRect && (
                <MotionBox
                    position="fixed"
                    background="error"
                    style={{
                        left: targetRect.x - PROFILE_BORDER_WIDTH,
                        top: targetRect.y - PROFILE_BORDER_WIDTH,
                        width: targetRect.width + PROFILE_BORDER_WIDTH * 2,
                        height: targetRect.height + PROFILE_BORDER_WIDTH * 2,
                        background:
                            'linear-gradient(hsl(266, 94%, 65%) 0%, hsl(3, 100%, 67%) 100%)',
                        mask: `radial-gradient(${
                            targetRect.width / 2 - PROFILE_BORDER_WIDTH
                        }px, #0000 98%, #000)`,
                    }}
                    animate={{ opacity: [0, 1, 0] }}
                    rounded="full"
                    transition={{ duration: duration + 2.0 }}
                    onAnimationComplete={onAnimationFinished}
                />
            )}
            <MotionBox
                position="fixed"
                animate={shouldAnimateOut ? { opacity: 0, scale: 0 } : undefined}
                transition={{ duration: 0.3 }}
                style={{
                    left: targetCenter.x - 20,
                    top: targetCenter.y - 20,
                }}
            >
                <MotionBox
                    animate={{
                        transform: transforms,
                        opacity: [0.1, 0.55, 1],
                    }}
                    initial={{
                        transform: `scaleY(1.0) rotateZ(0deg) translateX(${dx}px) translateY(${dy}px) `,
                        opacity: 0.1,
                    }}
                    transition={{ ease: 'linear', duration: duration }}
                    style={{
                        transformOrigin: 'center center',
                        background:
                            'linear-gradient(hsl(266, 94%, 65%) 0%, hsl(3, 100%, 67%) 100%)',
                    }}
                    padding="xs"
                    rounded="sm"
                    onAnimationComplete={translationAnimationFinished}
                >
                    <Box as="img" src={imageSrc} width="x4" height="x4" rounded="xs" />
                </MotionBox>
            </MotionBox>
        </>
    )
}
