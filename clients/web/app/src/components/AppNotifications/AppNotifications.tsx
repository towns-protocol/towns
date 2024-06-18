import { useAppNotifications } from 'hooks/useAppNotifications'

export const AppNotifications = () => {
    useAppNotifications()
    // no output to the dom
    return null
}
