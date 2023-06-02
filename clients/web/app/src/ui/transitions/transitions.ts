import { Transition } from 'framer-motion'

const root = {
    button: {
        mass: 0.6,
        stiffness: 100,
        type: 'spring',
    } satisfies Transition,
    panel: { type: 'spring', stiffness: 280, damping: 22, mass: 0.8 } satisfies Transition,
    panelAnimationDuration: 0.5, // Estimated duration of the panel animation
}

export const transitions = {
    ...root,
}
