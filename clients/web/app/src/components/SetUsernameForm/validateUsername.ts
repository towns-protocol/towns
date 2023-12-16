export const validateUsername = (username: string): boolean => {
    const regex = /^[a-zA-Z0-9_-]{1,16}$/
    return regex.test(username)
}
