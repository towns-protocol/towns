import { Transition } from 'framer-motion'

const root = {
    button: {
        mass: 0.6,
        stiffness: 100,
        type: 'spring',
    } satisfies Transition,
}

export const transitions = {
    ...root,
}
