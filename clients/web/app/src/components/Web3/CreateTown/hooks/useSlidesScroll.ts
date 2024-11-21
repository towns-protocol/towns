import { useEffect, useRef, useState } from 'react'

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

        const nextSlide = () => {
            nextSlideTimeout = setTimeout(() => {
                const height = scroller.clientHeight ?? 0
                const nextSlideIndex = slideIndexRef.current + 1
                scroller.scrollTo({
                    top: nextSlideIndex * height,
                    behavior: 'smooth',
                })
            }, SECOND_MS * 0.15)
        }

        scrollToNextRef.current = nextSlide
        scroller.addEventListener('scroll', onScroll)

        return () => {
            scroller.removeEventListener('scroll', onScroll)
        }
    }, [scroller])

    return { scrollRef, slideIndex, nextSlide: scrollToNextRef.current }
}
