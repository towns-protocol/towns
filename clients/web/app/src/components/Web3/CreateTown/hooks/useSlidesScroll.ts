import { useCallback, useEffect, useRef, useState } from 'react'

import { SECOND_MS } from 'data/constants'

export const usePaginationScroll = (props: { numSlides: number }) => {
    const { numSlides } = props
    const indexRef = useRef(0)

    const [slideIndex, setSlideIndex] = useState(0)
    const slideIndexRef = useRef(slideIndex)
    slideIndexRef.current = slideIndex

    const numSlidesRef = useRef(numSlides)
    numSlidesRef.current = numSlides

    const [scroller, setScroller] = useState<HTMLDivElement>()

    const scrollRef = (el: HTMLDivElement) => {
        setScroller(el)
    }

    const scrollToNextRef = useRef<() => void>()
    const scrollToSlideRef = useRef<(slideIndex: number) => void>()

    useEffect(() => {
        if (!scroller) {
            return
        }

        let nextSlideTimeout: NodeJS.Timeout | undefined

        const onScroll = () => {
            if (!scroller) {
                return
            }

            const numSlides = numSlidesRef.current

            if (nextSlideTimeout) {
                clearTimeout(nextSlideTimeout)
                nextSlideTimeout = undefined
            }

            const containerHeight = scroller.clientHeight ?? 0

            if (!scroll || !containerHeight) {
                return
            }
            const ratio = 1 / numSlides
            const scrollHeight = containerHeight * numSlides * ratio
            const index = Math.min(scroller.scrollTop / scrollHeight, numSlides)

            const direction = Math.sign(index - indexRef.current)
            indexRef.current = index

            const s = Math[direction === 1 ? 'ceil' : 'floor'](index)
            setSlideIndex(s)
        }

        const scrollToSlide = (slideIndex: number) => {
            nextSlideTimeout = setTimeout(() => {
                const height = scroller.clientHeight ?? 0
                scroller.scrollTo({
                    top: slideIndex * height,
                    behavior: 'smooth',
                })
            }, SECOND_MS * 0.15)
        }

        const nextSlide = () => {
            scrollToSlide(slideIndexRef.current + 1)
        }

        scrollToSlideRef.current = scrollToSlide
        scrollToNextRef.current = nextSlide

        scroller.addEventListener('scroll', onScroll)

        return () => {
            scroller.removeEventListener('scroll', onScroll)
        }
    }, [scroller])

    const nextSlide = useCallback(() => {
        scrollToNextRef.current?.()
    }, [])

    const scrollToSlide = useCallback((slideIndex: number) => {
        scrollToSlideRef.current?.(slideIndex)
    }, [])

    return {
        scrollRef,
        slideIndex,
        nextSlide,
        scrollToSlide,
    }
}
