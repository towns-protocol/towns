import { beforeAll, vi } from 'vitest'
import * as zustand from 'zustand'
import { act } from 'react-test-renderer'

beforeAll(async () => {
    if (!process.env.AA_RPC_URL) {
        throw new Error('AA_RPC_URL must be defined')
    }
    // assign the RPC_URL used in spacedapp mock web 3 provider
    process.env.RPC_URL = process.env.AA_RPC_URL
    // assign the towns env
    process.env.RIVER_ENV = process.env.RIVER_ENV ?? 'gamma'
})

// https://zustand.docs.pmnd.rs/guides/testing
//////////////////////
// ZUSTAND STORES ////
//////////////////////
const { create: actualCreate, createStore: actualCreateStore } = await vi.importActual<
    typeof zustand
>('zustand')

// a variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>()

const createUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
    const store = actualCreate(stateCreator)
    const initialState = store.getInitialState()
    storeResetFns.add(() => {
        store.setState(initialState, true)
    })
    return store
}

// when creating a store, we get its initial state, create a reset function and add it in the set
export const create = (<T>(stateCreator: zustand.StateCreator<T>) => {
    console.log('zustand create mock')

    // to support curried version of create
    return typeof stateCreator === 'function' ? createUncurried(stateCreator) : createUncurried
}) as typeof zustand.create

const createStoreUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
    const store = actualCreateStore(stateCreator)
    const initialState = store.getInitialState()
    storeResetFns.add(() => {
        store.setState(initialState, true)
    })
    return store
}

// when creating a store, we get its initial state, create a reset function and add it in the set
export const createStore = (<T>(stateCreator: zustand.StateCreator<T>) => {
    console.log('zustand createStore mock')

    // to support curried version of createStore
    return typeof stateCreator === 'function'
        ? createStoreUncurried(stateCreator)
        : createStoreUncurried
}) as typeof zustand.createStore

// reset all stores after each test run
afterEach(() => {
    act(() => {
        storeResetFns.forEach((resetFn) => {
            resetFn()
        })
    })
})

//////////////////////
// END ZUSTAND ///////
//////////////////////
