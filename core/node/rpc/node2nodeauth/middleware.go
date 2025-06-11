package node2nodeauth

import (
	"net/http"
)

// RequireCertMiddleware is a middleware that requires the node-2-node client certificate.
// This works together with VerifyPeerCertificate which verifies the certificate since the given certificate
// is required for some endpoints (internode service) only.
// This middleware will be attached to the node-2-node RPC server after mTLS auth is deployed to all envs.
func RequireCertMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var found bool
		for _, cert := range r.TLS.PeerCertificates {
			if len(cert.Subject.Organization) == 1 && cert.Subject.Organization[0] == certIssuer {
				found = true
				break
			}
		}

		if !found {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
