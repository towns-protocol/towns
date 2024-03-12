import React, { useCallback, useState } from 'react'

import { AnimatePresence } from 'framer-motion'
import { Box, MotionBox, MotionStack, Stack, Text } from '@ui'
import { TownsToken } from '@components/TownsToken/TownsToken'

const images: string[] = [
    '/public/placeholders/nft_1.png',
    '/public/placeholders/nft_38.png',
    '/public/placeholders/nft_42.png',
    '/public/placeholders/nft_2.png',
    '/public/placeholders/nft_17.png',
    '/public/placeholders/nft_13.png',
    '/public/placeholders/nft_21.png',
    '/public/placeholders/nft_6.png',
]

const texts: string[] = [
    'Creating town onchain…',
    'Decentralizing communications…',
    'Securing ownership onchain…',
]

const IMAGE_WIDTH_DESKTOP = 150
const CONTAINER_WIDTH_DESKTOP = 440

export const CreateSpaceMintAnimation = () => {
    const [animationIndex, setAnimationIndex] = useState<{ image: number; text: number }>({
        image: images.length,
        text: 0,
    })
    const onScrollAnimationComplete = useCallback(() => {
        const index = { ...animationIndex }
        index.image = index.image - 1
        if (index.image < 0) {
            index.image = images.length
        }
        // The text updates at half speed compared to the images.
        // because of the x-wrapping illusion, we don't update it when wrapping (index == images.length)
        if (index.image !== images.length && index.image % 2 === 0) {
            index.text = (index.text + 1) % texts.length
        }
        setAnimationIndex(index)
    }, [animationIndex, setAnimationIndex])

    // Scale the image up around the center of the container
    function imageScaleForIndex(index: number) {
        const current = animationIndex.image % images.length
        const indexDistance = Math.abs(index - current)
        return Math.max(1 - indexDistance * 0.6, 0.6)
    }

    // When we wrap around the x-axis, we want to reset the animation to center around
    // the first image instantly, without any delay or duration
    const duration = animationIndex.image === images.length ? 0 : 0.5
    const delay = animationIndex.image === images.length ? 0 : 1
    const imageWidth = IMAGE_WIDTH_DESKTOP
    const containerWidth = CONTAINER_WIDTH_DESKTOP
    const containerTransformX =
        -1 * (animationIndex.image * imageWidth) + (containerWidth - imageWidth) / 2 - imageWidth

    return (
        <Box absoluteFill centerContent background="backdropBlur">
            <MotionBox
                centerContent
                background="level2"
                style={{ width: containerWidth }}
                height="350"
                rounded="md"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, type: 'spring' }}
                overflow="hidden"
            >
                <Stack width="100%" gap="md">
                    <MotionStack
                        horizontal
                        alignItems="center"
                        height="100%"
                        animate={{
                            transform: `translateX(${containerTransformX}px)`,
                        }}
                        transition={{ duration: duration, ease: 'easeInOut', delay: delay }}
                        style={{ width: IMAGE_WIDTH_DESKTOP * images.length * 2 }}
                        onAnimationComplete={onScrollAnimationComplete}
                    >
                        {/* On the left side, pad the list with the last image in the list */}
                        <IconBox
                            animationDuration={duration}
                            delay={delay}
                            imageSrc={images[images.length - 1]}
                            scale={imageScaleForIndex(images.length - 1)}
                        />

                        {images.map((image, index) => (
                            <IconBox
                                animationDuration={duration}
                                delay={delay}
                                imageSrc={image}
                                scale={imageScaleForIndex(index)}
                                key={image}
                            />
                        ))}

                        {/* On the right side, pad the list with the two first images in the list */}
                        <IconBox
                            animationDuration={duration}
                            delay={delay}
                            imageSrc={images[0]}
                            scale={imageScaleForIndex(0)}
                        />

                        <IconBox
                            animationDuration={duration}
                            delay={delay}
                            imageSrc={images[1]}
                            scale={imageScaleForIndex(1)}
                        />
                    </MotionStack>
                    <Box height="x4" position="relative">
                        <AnimatePresence>
                            <MotionBox
                                absoluteFill
                                centerContent
                                width="100%"
                                transition={{ delay: delay, duration: duration }}
                                animate={{ opacity: 1 }}
                                initial={{ opacity: 0 }}
                                exit={{ opacity: 0 }}
                                key={animationIndex.text}
                                height="x4"
                            >
                                <Text fontWeight="strong" fontSize="lg" color="default">
                                    {texts[animationIndex.text]}
                                </Text>
                            </MotionBox>
                        </AnimatePresence>
                    </Box>
                </Stack>
            </MotionBox>
        </Box>
    )
}

const IconBox = (props: {
    imageSrc: string
    scale: number
    delay: number
    animationDuration: number
}) => {
    const { imageSrc, scale, animationDuration, delay } = props
    const sideLength = IMAGE_WIDTH_DESKTOP

    return (
        <MotionBox centerContent width="150">
            <Stack gap alignItems="center">
                <MotionStack
                    style={{
                        transformOrigin: 'center center',
                        width: sideLength,
                        height: sideLength,
                    }}
                    animate={{
                        transform: `scale(${scale})`,
                    }}
                    transition={{ duration: animationDuration, ease: 'easeInOut', delay: delay }}
                    alignItems="center"
                >
                    <TownsToken size="md" imageSrc={imageSrc} />
                </MotionStack>
            </Stack>
        </MotionBox>
    )
}
