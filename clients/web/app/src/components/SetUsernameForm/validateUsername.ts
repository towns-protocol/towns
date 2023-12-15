export const validateUsername = (username: string): boolean => {
    const regex = /^[a-zA-Z0-9_]{3,16}$/
    return regex.test(username)
}
