import { Transition } from 'framer-motion'

const root = {
    button: {
        mass: 0.6,
        stiffness: 100,
        type: 'spring',
    } satisfies Transition,
    panel: { type: 'spring', stiffness: 500, damping: 50, restDelta: 0.1 } satisfies Transition,
    panelAnimationDuration: 0.5, // Estimated duration of the panel animation
}

export const transitions = {
    ...root,
}
