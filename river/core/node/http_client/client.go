package http_client

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"os"
	"path/filepath"

	"github.com/river-build/river/core/node/dlog"
	"golang.org/x/net/http2"
)

// getTLSConfig returns a tls.Config with the system cert pool
// and any additional CA certs specified in the config file.
func getTLSConfig(ctx context.Context) *tls.Config {
	log := dlog.FromCtx(ctx)
	// Load the system cert pool
	sysCerts, err := x509.SystemCertPool()
	if err != nil {
		log.Warn("getTLSConfig Error loading system certs", "err", err)
		return nil
	}

	// Attempt to load ~/river-ca-cert.pem
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Warn("getTLSConfig Failed to get user home directory:", "err", err)
		return nil
	}
	// TODO - hook this up to the config file
	riverCaCertPath := filepath.Join(homeDir, "river-ca-cert.pem")
	riverCaCertPEM, err := os.ReadFile(riverCaCertPath)
	if err != nil {
		return nil
	}

	log.Warn("getTLSConfig using river CA cert file for development only", "err", err)

	// Append river CA cert to the system cert pool
	if ok := sysCerts.AppendCertsFromPEM(riverCaCertPEM); !ok {
		log.Error("Failed to append river CA cert to system cert pool")
		return nil
	}

	tlsConfig := &tls.Config{
		RootCAs: sysCerts,
	}

	return tlsConfig
}

// GetHttpClient returns a http client with TLS configuration
// set using any CA set in the config file. Needed so we can use a
// test CA in the test suite. Running under github action environment
// there was no other way to get the test CA into the client.
func GetHttpClient(ctx context.Context) (*http.Client, error) {
	return &http.Client{
		Transport: &http2.Transport{
			TLSClientConfig: getTLSConfig(ctx),
		},
	}, nil
}

func GetHttp11Client(ctx context.Context) (*http.Client, error) {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig:   getTLSConfig(ctx),
			ForceAttemptHTTP2: false,
			TLSNextProto:      map[string]func(authority string, c *tls.Conn) http.RoundTripper{},
		},
	}, nil
}
