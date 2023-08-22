import React, {
    CSSProperties,
    MutableRefObject,
    RefObject,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

const USE_TRANSITION = false

type VListItemProps<T> = {
    uid: string
    index: number
    item: T
    onAdded: (
        ref: RefObject<HTMLDivElement>,
        heightRef: RefObject<HTMLDivElement>,
        key: string,
        index: number,
    ) => void
    onRemoved: (
        ref: RefObject<HTMLDivElement>,
        heightRef: RefObject<HTMLDivElement>,
        key: string,
        index: number,
    ) => void
    itemRenderer: (item: T, ref?: RefObject<HTMLDivElement>, index?: number) => JSX.Element
    isGroup?: boolean
    groupHeight?: number
}

export const VListItem = <T,>(props: VListItemProps<T>) => {
    const { uid, index, onAdded, onRemoved, itemRenderer, isGroup, groupHeight } = props

    const ref = useRef<HTMLDivElement>(null)
    const heightRef: MutableRefObject<HTMLDivElement | null> = useRef(null)

    useLayoutEffect(() => {
        heightRef.current = heightRef.current || ref.current
        onAdded(ref, heightRef, uid, index)

        return () => {
            onRemoved(ref, heightRef, uid, index)
        }
    }, [index, onAdded, onRemoved, heightRef, uid])

    const [isRendered, setIsRendered] = useState(false)

    useLayoutEffect(() => {
        setIsRendered(true)
    }, [])

    const style = useMemo(() => {
        const groupStyle: React.CSSProperties =
            !isGroup || !groupHeight
                ? {}
                : {
                      minHeight: groupHeight + `px`,
                      pointerEvents: `none`,
                  }

        const transitionStyle: React.CSSProperties = !USE_TRANSITION
            ? {}
            : !isRendered
            ? { opacity: 0 }
            : { opacity: 1, transition: `opacity 180ms ease` }

        return {
            ...itemStyle,
            ...groupStyle,
            ...transitionStyle,
        }
    }, [groupHeight, isGroup, isRendered])

    return (
        <div ref={ref} style={style} data-item-key={uid}>
            {itemRenderer(props.item, isGroup ? heightRef : undefined, index)}
        </div>
    )
}

const itemStyle: CSSProperties = {
    position: 'absolute',
    width: `100%`,
}
