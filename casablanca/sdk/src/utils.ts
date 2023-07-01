export function unsafeProp<K extends keyof any | undefined>(prop: K): boolean {
    return prop === '__proto__' || prop === 'prototype' || prop === 'constructor'
}

export function safeSet<O extends Record<any, any>, K extends keyof O>(
    obj: O,
    prop: K,
    value: O[K],
): void {
    if (unsafeProp(prop)) {
        throw new Error('Trying to modify prototype or constructor')
    }

    obj[prop] = value
}

export function promiseTry<T>(fn: () => T | Promise<T>): Promise<T> {
    return Promise.resolve(fn())
}

/**
 * Compare two objects for equality. The objects MUST NOT have circular references.
 *
 */
// todo: refactor to use concrete types and linter rules
/* eslint-disable */
export function deepCompare(x: any, y: any): boolean {
    // Inspired by
    // http://stackoverflow.com/questions/1068834/object-comparison-in-javascript#1144249

    // Compare primitives and functions.
    // Also check if both arguments link to the same object.
    if (x === y) {
        return true
    }

    if (typeof x !== typeof y) {
        return false
    }

    // special-case NaN (since NaN !== NaN)
    if (typeof x === 'number' && isNaN(x) && isNaN(y)) {
        return true
    }

    // special-case null (since typeof null == 'object', but null.constructor
    // throws)
    if (x === null || y === null) {
        return x === y
    }

    // everything else is either an unequal primitive, or an object
    if (!(x instanceof Object)) {
        return false
    }

    // check they are the same type of object
    if (x.constructor !== y.constructor || x.prototype !== y.prototype) {
        return false
    }

    // special-casing for some special types of object
    if (x instanceof RegExp || x instanceof Date) {
        return x.toString() === y.toString()
    }

    // the object algorithm works for Array, but it's sub-optimal.
    if (Array.isArray(x)) {
        if (x.length !== y.length) {
            return false
        }

        for (let i = 0; i < x.length; i++) {
            if (!deepCompare(x[i], y[i])) {
                return false
            }
        }
    } else {
        // check that all of y's direct keys are in x
        for (const p in y) {
            if (
                Object.prototype.hasOwnProperty.call(y, p) !==
                Object.prototype.hasOwnProperty.call(x, p)
            ) {
                return false
            }
        }

        // finally, compare each of x's keys with y
        for (const p in x) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p) || !deepCompare(x[p], y[p])) {
                return false
            }
        }
    }
    return true
}
/* eslint-enable */
