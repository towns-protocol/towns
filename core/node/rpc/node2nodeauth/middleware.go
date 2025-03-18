package node2nodeauth

import (
	"net/http"
)

// RequireCertMiddleware is a middleware that requires the node-2-node client certificate.
// This works together with VerifyPeerCertificate which verifies the certificate.
// This middleware will be attached to the node-2-node RPC server after mTLS auth is deployed to all envs.
func RequireCertMiddleware(next http.Handler) http.Handler { //nolint:unused
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if len(r.TLS.PeerCertificates) != 1 {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
