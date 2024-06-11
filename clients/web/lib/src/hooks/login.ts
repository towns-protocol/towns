export interface AuthenticationError {
    code: number
    message: string
    error?: Error
}

/*
 *                                                          /-> Deauthenticating -> [None]
 *                                     -> [Credentialed] -<
 *                                   /                      🤖 [ConnectedToRiver]
 * [None] -> EvaluatingCredentials -<  -> [None]
 *                                   \
 *                                     -> [ConnectedToRiver] -> DisconnectingFromRiver -> [None]
 */
export enum AuthStatus {
    /** User is not authenticated or connected to the river client. */
    None = 'None',
    /** Transition state: None -> EvaluatingCredentials -> [Credentialed OR ConnectedToRiver]
     *  if a river user is found, will connect to river client, otherwise will just validate credentials.
     */
    EvaluatingCredentials = 'EvaluatingCredentials',
    /** User authenticated with a valid credential but without an active river stream client. */
    Credentialed = 'Credentialed',
    /** User authenticated with a valid credential and with an active river river client. */
    ConnectedToRiver = 'ConnectedToRiver',
    /** Transition state: ConnectedToRiver -> DisconnectingFromRiver -> None */
    DisconnectingFromRiver = 'DisconnectingFromRiver',
    /** Transition state: Credentialed -> Deauthenticating -> None */
    Deauthenticating = 'Deauthenticating',
}
