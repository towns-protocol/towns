import { Observable } from './observable'

export class Constant<T> extends Observable<T> {
    constructor(value: T) {
        super(value)
    }

    set(_fn: (prevValue: T) => T): boolean {
        throw new Error('Cannot set value of constant')
    }

    setValue(_newValue: T): boolean {
        throw new Error('Cannot set value of constant')
    }
}
