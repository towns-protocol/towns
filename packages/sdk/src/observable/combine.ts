import { Observable } from './observable'

/**
 * Combines multiple observables into a single observable object.
 *
 * The Combine class creates a new observable that contains the current values
 * of all input observables as properties. When any input observable changes,
 * the combined observable will emit a new value with all current values.
 *
 * @example
 * ```typescript
 * const nameObs = new Observable('John')
 * const ageObs = new Observable(25)
 * const isActiveObs = new Observable(true)
 *
 * const combined = combine({
 *   name: nameObs,
 *   age: ageObs,
 *   isActive: isActiveObs,
 * })
 *
 * // combined.value will be: { name: "John", age: 25, isActive: true }
 *
 * // Subscribe to changes in the combined observable
 * combined.subscribe((newValue, prevValue) => {
 *   console.log('Combined value changed:', newValue)
 * })
 *
 * // Changing any input observable will trigger the combined observable
 * nameObs.setValue('Jane') // combined.value becomes { name: "Jane", age: 25, isActive: true }
 * ```
 *
 */
export const combine = <T extends Record<string, any>>(observables: {
    [K in keyof T]: Observable<T[K]>
}) => {
    return new Combine(observables)
}

class Combine<T extends Record<string, any>> extends Observable<T> {
    private observables: { [K in keyof T]: Observable<T[K]> }
    private unsubscribers: (() => void)[] = []

    constructor(observables: { [K in keyof T]: Observable<T[K]> }) {
        // Create initial combined value
        const initialValue = {} as T
        for (const key in observables) {
            initialValue[key] = observables[key].value
        }

        super(initialValue)
        this.observables = observables

        // Subscribe to all observables
        for (const key in observables) {
            const unsubscriber = observables[key].subscribe(() => {
                this.updateCombinedValue()
            })
            this.unsubscribers.push(unsubscriber)
        }
    }

    private updateCombinedValue() {
        const newValue = {} as T
        for (const key in this.observables) {
            newValue[key] = this.observables[key].value
        }
        this.setValue(newValue)
    }

    dispose() {
        this.unsubscribers.forEach((unsubscriber) => unsubscriber())
        this.unsubscribers = []
    }
}
