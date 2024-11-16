export enum AuthStatus {
    /** Fetching river urls. */
    Initializing = 'Initializing',
    /** Transition state: None -\> EvaluatingCredentials -\> [Credentialed OR ConnectedToRiver]
     *  if a river user is found, will connect to river client, otherwise will just validate credentials.
     */
    EvaluatingCredentials = 'EvaluatingCredentials',
    /** User authenticated with a valid credential but without an active river stream client. */
    Credentialed = 'Credentialed',
    /** User authenticated with a valid credential and with an active river river client. */
    ConnectingToRiver = 'ConnectingToRiver',
    ConnectedToRiver = 'ConnectedToRiver',
    /** Disconnected, client was stopped */
    Disconnected = 'Disconnected',
    /** Error state: User failed to authenticate or connect to river client. */
    Error = 'Error',
}
