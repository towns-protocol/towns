import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { Box } from 'ui/components/Box/Box'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Text } from 'ui/components/Text/Text'
import { Icon } from 'ui/components/Icon'
import { IconButton } from '../IconButton/IconButton'

export const MotionBox = motion(Box)
export const MotionStack = motion(Stack)
export const MotionParagraph = motion(Paragraph)
export const MotionText = motion(Text)
export const MotionIcon = motion(Icon)
export const MotionIconButton = motion(IconButton)

export type MotionBoxProps = ComponentProps<typeof MotionBox>
