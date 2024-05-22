import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'

const JOIN = 'join'
const PRIVY_OAUTH_STATE = 'privy_oauth_state'

export function usePublicPageLoginFlow() {
    const spaceId = useSpaceIdFromPathname()
    const { joiningSpace, setJoiningSpace, setJoinStep, joinStep, clear } = publicPageLoginStore(
        useShallow((s) => ({
            joiningSpace: s.joiningSpace,
            joinStep: s.joinStep,
            setJoiningSpace: s.setJoiningSpace,
            setJoinStep: s.setJoinStep,
            clear: s.clear,
        })),
    )

    const start = useCallback(() => {
        if (!spaceId || joiningSpace) {
            return
        }
        setJoiningSpace(spaceId)
    }, [joiningSpace, setJoiningSpace, spaceId])

    return useMemo(
        () => ({
            start,
            end: clear,
            joiningSpace,
            joinStep,
            setJoinStep,
        }),
        [start, clear, joiningSpace, joinStep, setJoinStep],
    )
}

const params = new URLSearchParams(window.location.search)

// using searchParams from react-router-dom navigates and the params from privy redirect on login get wried and buggy
// https://github.com/remix-run/react-router/discussions/9851
function updateQueryStringValueWithoutNavigation(queryKey: string, queryValue: string) {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const oldQuery = currentSearchParams.get(queryKey) ?? ''
    if (queryValue === oldQuery) {
        return
    }

    if (queryValue) {
        currentSearchParams.set(queryKey, queryValue)
    } else {
        currentSearchParams.delete(queryKey)
    }
    const newUrl = [window.location.pathname, currentSearchParams.toString()]
        .filter(Boolean)
        .join('?')
    window.history.replaceState(null, '', newUrl)
}

export enum JoinStep {
    None,
    JoinedTown,
    JoinedDefaultChannel,
    Done,
}

const publicPageLoginStore = create<{
    joiningSpace: string | undefined
    joinStep: JoinStep
    setJoinStep: (step: JoinStep) => void
    setJoiningSpace: (isJoining: string) => void
    clear: () => void
}>((set) => ({
    joinStep: JoinStep.None,
    setJoinStep: (joinStep) => set({ joinStep }),
    joiningSpace:
        // check privy oauth state also to prevent getting into join flow if user refreshes in the middle of the flow
        params.has(PRIVY_OAUTH_STATE) && params.has(JOIN)
            ? params.get(JOIN)?.toString()
            : undefined,
    setJoiningSpace: (joiningSpaceId) => {
        updateQueryStringValueWithoutNavigation(JOIN, joiningSpaceId)
        set({ joiningSpace: joiningSpaceId })
    },
    clear: () => {
        updateQueryStringValueWithoutNavigation(JOIN, '')
        set({
            joiningSpace: undefined,
            joinStep: JoinStep.None,
        })
    },
}))
