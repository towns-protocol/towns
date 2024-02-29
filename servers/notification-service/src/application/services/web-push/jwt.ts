export interface JwtInfo {
    typ: string
    alg: string
}

export interface JwtData {
    /**
     * The aud value is the "audience", i.e. who the JWT is for.
     * For web push the audience is the push service, so we set it to the origin
     * of the push service.
     */
    aud: string
    /**
     * The exp value is the expiration of the JWT, this prevent snoopers from being
     * able to re-use a JWT if they intercept it. The expiration is a timestamp in
     * seconds and must be no longer 24 hours.
     */
    exp: number
    /**
     * The sub value needs to be either a URL or a mailto email address. This is so
     * that if a push service needed to reach out to sender, it can find contact
     * information from the JWT.
     */
    sub: string
}
