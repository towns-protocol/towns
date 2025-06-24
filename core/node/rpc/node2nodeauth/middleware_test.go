package node2nodeauth

import (
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireCertMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		peerCerts      []*x509.Certificate
		expectedStatus int
	}{
		{
			name:           "No certificates",
			peerCerts:      []*x509.Certificate{},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Valid certificate provided",
			peerCerts: []*x509.Certificate{{
				Subject: pkix.Name{Organization: []string{"towns.com"}},
			}},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Multiple certificates provided with the second being valid",
			peerCerts: []*x509.Certificate{{
				Subject: pkix.Name{Organization: []string{"anotherorg.com"}},
			}, {
				Subject: pkix.Name{Organization: []string{"towns.com"}},
			}},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a request with the specified peer certificates
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.TLS = &tls.ConnectionState{
				PeerCertificates: tt.peerCerts,
			}

			// Create a response recorder
			rr := httptest.NewRecorder()

			// Create a test handler that always returns StatusOK
			testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			// Wrap the test handler with the RequireCertMiddleware
			handler := RequireCertMiddleware(testHandler)

			// Serve the request
			handler.ServeHTTP(rr, req)

			// Check the response status code
			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}
