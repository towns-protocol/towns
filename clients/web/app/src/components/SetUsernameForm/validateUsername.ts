export const validateUsername = (username: string): boolean => {
    const regex = /^[a-zA-Z0-9_-]{1,16}$/
    return regex.test(username)
}

export const validateDisplayName = (displayName: string) => {
    if (displayName.endsWith('.eth')) {
        return { valid: false, message: 'Display name cannot end with .eth' }
    }
    if (displayName.length > 32) {
        return {
            valid: false,
            message: 'Your display name must be between 1 and 32 characters',
        }
    }
    return { valid: true }
}
