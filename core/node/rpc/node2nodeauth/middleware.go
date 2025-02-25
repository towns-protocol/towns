package node2nodeauth

import (
	"crypto/x509"
	"net/http"
)

// VerifyPeerCertificateFunc is a function that verifies the peer certificates.
type VerifyPeerCertificateFunc func(rawCerts [][]byte, verifiedChains [][]*x509.Certificate) error

// RequireCertMiddleware is a middleware that requires the node-2-node client certificate.
// This works together with verifyNode2NodePeerCertificate which verifies the certificate.
func RequireCertMiddleware(next http.Handler) http.Handler { //nolint:unused
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var found bool
		for _, cert := range r.TLS.PeerCertificates {
			if cert.Subject.CommonName == node2NodeCertName {
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
