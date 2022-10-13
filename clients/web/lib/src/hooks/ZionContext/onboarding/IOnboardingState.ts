export type IOnboardingState =
    | ObState_None
    | ObState_Loading
    | ObState_UserProfile
    | ObState_Toast
    | ObState_Done
    | ObState_Error

export interface ObState_None {
    kind: 'none'
}

export interface ObState_Loading {
    kind: 'loading'
    message: string
}

export interface ObState_UserProfile {
    kind: 'user-profile'
    bNeedsAvatar: boolean
    bNeedsDisplayName: boolean
}

export interface ObState_Done {
    kind: 'done'
}

export interface ObState_Toast {
    kind: 'toast'
    message: string
}

export interface ObState_Error {
    kind: 'error'
    message: string
    error?: Error
    previousErrors?: { message: string; error?: Error }[]
}
