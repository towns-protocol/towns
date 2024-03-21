import React, { useCallback, useState } from 'react'

import { AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Box, MotionBox, MotionStack, Stack, Text, useZLayerContext } from '@ui'
import { TownsToken } from '@components/TownsToken/TownsToken'

import town1 from './images/town_1.jpg'
import town2 from './images/town_2.jpg'
import town3 from './images/town_3.jpg'
import town4 from './images/town_4.jpg'
import town5 from './images/town_5.jpg'
import town6 from './images/town_6.jpg'
import town7 from './images/town_7.jpg'
import town8 from './images/town_8.jpg'
import town9 from './images/town_9.jpg'
import town10 from './images/town_10.jpg'
import town11 from './images/town_11.jpg'
import town12 from './images/town_12.jpg'

const images = [
    town1,
    town2,
    town3,
    town4,
    town5,
    town6,
    town7,
    town8,
    town9,
    town10,
    town11,
    town12,
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
    const root = useZLayerContext().rootLayerRef?.current

    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        <Box centerContent absoluteFill background="backdropBlur" pointerEvents="auto">
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
        </Box>,
        root,
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

export default CreateSpaceMintAnimation
