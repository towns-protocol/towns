package http_client

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/net/http2"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/logging"
)

// GetClientCertFunc is a function that returns a client certificate
type GetClientCertFunc func(info *tls.CertificateRequestInfo) (*tls.Certificate, error)

// getTLSConfig returns a tls.Config with the system cert pool
// and any additional CA certs specified in the config file.
func getTLSConfig(ctx context.Context, getClientCert GetClientCertFunc) *tls.Config {
	log := logging.FromCtx(ctx)
	// Load the system cert pool
	sysCerts, err := x509.SystemCertPool()
	if err != nil {
		log.Warnw("getTLSConfig Error loading system certs", "error", err)
		return nil
	}

	// Attempt to load ~/towns-ca-cert.pem
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Warnw("getTLSConfig Failed to get user home directory:", "error", err)
		return nil
	}
	// TODO - hook this up to the config file
	townsCaCertPath := filepath.Join(homeDir, "towns-ca-cert.pem")
	townsCaCertPEM, err := os.ReadFile(townsCaCertPath)
	if err != nil {
		return nil
	}

	log.Warnw("getTLSConfig using towns CA cert file for development only")

	// Append towns CA cert to the system cert pool
	if ok := sysCerts.AppendCertsFromPEM(townsCaCertPEM); !ok {
		log.Errorw("Failed to append towns CA cert to system cert pool")
		return nil
	}

	tlsConfig := &tls.Config{
		RootCAs:              sysCerts,
		GetClientCertificate: getClientCert,
	}

	return tlsConfig
}

// GetHttpClient returns a http client with TLS configuration without mTLS.
func GetHttpClient(ctx context.Context, cfg *config.Config) (*http.Client, error) {
	return GetHttpClientWithCert(ctx, cfg, nil)
}

// GetHttpClientWithCert returns a http client with TLS configuration
// set using any CA set in the config file. Needed so we can use a
// test CA in the test suite. Running under github action environment
// there was no other way to get the test CA into the client.
func GetHttpClientWithCert(
	ctx context.Context,
	cfg *config.Config,
	getClientCert GetClientCertFunc,
) (*http.Client, error) {
	return &http.Client{
		Transport: &http2.Transport{
			TLSClientConfig: getTLSConfig(ctx, getClientCert),
			ReadIdleTimeout: 20 * time.Second, // send http2 ping on idle connection for keep alive
			PingTimeout:     15 * time.Second, // http2 ping must be received within 15s, if not connection is closed
		},
	}, nil
}

func GetHttp11Client(ctx context.Context) (*http.Client, error) {
	return &http.Client{
		Transport: &http.Transport{
			DisableKeepAlives: true,
			TLSClientConfig:   getTLSConfig(ctx, nil),
			ForceAttemptHTTP2: false,
			TLSNextProto:      map[string]func(authority string, c *tls.Conn) http.RoundTripper{},
		},
	}, nil
}

func GetH2cHttpClient(ctx context.Context, cfg *config.Config) (*http.Client, error) {
	// Define a custom HTTP/2 transport with h2c support
	return &http.Client{
		Transport: &http2.Transport{
			AllowHTTP: true,
			DialTLSContext: func(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
				// This bypasses TLS and just dials a plain TCP connection
				return (&net.Dialer{}).DialContext(ctx, network, addr)
			},
		},
	}, nil
}
