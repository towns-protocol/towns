package app_client

import (
	"errors"
	"fmt"
	"net"
	"net/http"
)

var (
	ErrCannotConnectToLoopbackAddress = fmt.Errorf("connection to loopback address is not allowed")
	ErrCannotConnectToPrivateIp       = fmt.Errorf("connection to private ip address is not allowed")
)

// SecureOutboundRoundtripper wraps an existing client.Transport object and requires the following
// - Outgoing requests resolve to neither loopbacks nor internal addresses when using the default resolver
// - Outgoing requests must be https
// - Redirects are also disallowed and result in an error
type SecureOutboundRoundtripper struct {
	Wrapped http.RoundTripper
}

func (t *SecureOutboundRoundtripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Scheme != "https" {
		return nil, errors.New("only HTTPS requests are allowed")
	}

	ips, err := net.DefaultResolver.LookupIPAddr(req.Context(), req.URL.Hostname())
	if err != nil {
		return nil, fmt.Errorf("could not resolve host: %w", err)
	}
	for _, ip := range ips {
		if ip.IP.IsLoopback() {
			return nil, fmt.Errorf(
				"connection to address %s is not allowed: %v",
				ip,
				ErrCannotConnectToLoopbackAddress,
			)
		}
		if ip.IP.IsPrivate() {
			return nil, fmt.Errorf(
				"connection to address %s is not allowed: %v",
				ip,
				ErrCannotConnectToPrivateIp,
			)
		}
	}

	resp, err := t.Wrapped.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	if 300 <= resp.StatusCode && resp.StatusCode < 400 {
		defer resp.Body.Close()
		return nil, fmt.Errorf("redirects disallowed")
	}
	return resp, nil
}

// NewExternalHttpsClient creates a new HTTP client that wraps the transport of
// an existing one, introducing the following restrictions:
// - requests sent to URLs that resolve to loopback or private ips are disallowed
// - non-https requests are disallowed
// - requests that result in redirects do not redirect, and produce an error
func NewExternalHttpsClient(base *http.Client) *http.Client {
	// Create a new HTTP client using the wrapped roundtripper
	return &http.Client{
		Transport: &SecureOutboundRoundtripper{Wrapped: base.Transport},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Disallow all redirects
		},
		Jar:     base.Jar,
		Timeout: base.Timeout,
	}
}
