import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, BoxProps } from '../Box/Box'
import { MotionBox, MotionIcon } from '../Motion/MotionComponents'
import { Text } from '../Text/Text'

type HeaderProps = {
    title?: string
    subTitle?: string
}

type BaseProps = {
    isExpanded: boolean
    title?: string
    subTitle?: string
    header?: (props: HeaderProps & { isExpanded: boolean }) => JSX.Element
    children: JSX.Element
} & HeaderProps &
    BoxProps

type Props<T extends number | boolean> = {
    setIsExpanded?: T extends boolean ? (arg: boolean) => void : never
    activeIndex?: T extends number ? number : never
    setActiveIndex?: T extends number ? (arg: number) => void : never
} & BaseProps

const Header = ({
    title,
    subTitle,
    isExpanded,
}: HeaderProps & {
    isExpanded: boolean
}) => {
    return (
        <Box horizontal justifyContent="spaceBetween">
            <Box gap="sm">
                {title && <Text color="default">{title}</Text>}
                {subTitle && <Text color="gray2">{subTitle}</Text>}
            </Box>
            <MotionIcon
                animate={{
                    rotate: isExpanded ? '0deg' : '-180deg',
                }}
                initial={{ rotate: '-180deg' }}
                transition={{ duration: 0.2 }}
                type="arrowDown"
            />
        </Box>
    )
}

function _Accordion<X extends number | boolean>(props: Props<X>) {
    const {
        isExpanded,
        setIsExpanded,
        setActiveIndex,
        children,
        activeIndex,
        header,
        title,
        subTitle,
        ...boxProps
    } = props
    const onClick = React.useCallback(() => {
        if (activeIndex !== undefined) {
            setActiveIndex?.(activeIndex)
        } else {
            setIsExpanded?.(!isExpanded)
        }
    }, [activeIndex, isExpanded, setActiveIndex, setIsExpanded])

    return (
        <Box background="level2" rounded="sm" {...boxProps}>
            <Box padding="md" cursor="pointer" onClick={onClick}>
                {header ? (
                    header({
                        isExpanded,
                        title: title,
                        subTitle: subTitle,
                    })
                ) : (
                    <Header isExpanded={isExpanded} title={title} subTitle={subTitle} />
                )}
            </Box>
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <MotionBox
                        overflow="hidden"
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            closed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.2 }}
                    >
                        <Box paddingX="md" paddingBottom="md">
                            {children}
                        </Box>
                    </MotionBox>
                )}
            </AnimatePresence>
        </Box>
    )
}

export const Accordion = (
    props: { initialExpanded?: boolean } & Pick<Props<boolean>, 'children' | 'header'> &
        HeaderProps &
        BoxProps,
) => {
    const { initialExpanded, children } = props
    const [isExpanded, setIsExpanded] = useState(initialExpanded || false)
    return (
        <_Accordion isExpanded={isExpanded} setIsExpanded={setIsExpanded} {...props}>
            {children}
        </_Accordion>
    )
}

type AccordionGroupChild = Pick<Props<number>, 'children' | 'header'> &
    HeaderProps &
    BoxProps & {
        id: string
    }

export type AccordionGroupProps = {
    initialExpandedIndex?: number | false
    accordions: AccordionGroupChild[]
}

// A group of accordions that expands automatically, and allows only 1 accordion open at a time
export const AccordionGroup = (props: AccordionGroupProps) => {
    const [activeIndex, setActiveIndex] = useState(
        props.initialExpandedIndex !== undefined
            ? props.initialExpandedIndex === false
                ? undefined
                : props.initialExpandedIndex
            : 0,
    )

    return (
        <>
            {props.accordions.map(({ children, id, ...rest }, index) => (
                <_Accordion<number>
                    data-testid="accordion-group-item"
                    activeIndex={index}
                    setActiveIndex={setActiveIndex}
                    isExpanded={activeIndex === index}
                    key={id}
                    {...rest}
                >
                    {children}
                </_Accordion>
            ))}
        </>
    )
}
