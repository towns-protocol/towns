package app_client

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"
)

var (
	ErrCannotConnectToLoopbackAddress = fmt.Errorf("connection to loopback address is not allowed")
	ErrCannotConnectToPrivateIp       = fmt.Errorf("connection to private ip address is not allowed")
)

// validatedDialContext validates that the ips resolved during dns lookup when dialing
// a new connection are neither loopbacks or private ips. This adds some protection against
// server-side request forgery attacks, which is needed because the app registry service
// allows clients to register their own webhooks.
func validatedDialContext(
	baseDialer func(ctx context.Context, network, addr string) (net.Conn, error),
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		// Split the address into host and port.
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid address %q: %w", addr, err)
		}

		// Perform DNS lookup.
		ips, err := net.LookupIP(host)
		if err != nil {
			return nil, fmt.Errorf("DNS lookup failed for %q: %w", host, err)
		}

		// Validate each IP (reject loopback or private IPs).
		for _, ip := range ips {
			if ip.IsLoopback() {
				return nil, fmt.Errorf(
					"connection to address %s is not allowed: %v",
					ip,
					ErrCannotConnectToLoopbackAddress,
				)
			}
			if ip.IsPrivate() {
				return nil, fmt.Errorf(
					"connection to address %s is not allowed: %v",
					ip,
					ErrCannotConnectToPrivateIp,
				)
			}
		}

		// Proceed with the base dialing function.
		return baseDialer(ctx, network, net.JoinHostPort(host, port))
	}
}

// NewExternalHttpClient creates a new HTTP client that wraps an existing one,
// injecting a validated dial context which requires all resolved ip addresses to be
// external - meaning, neither loopback nor private. This is a security measure that
// contributes to protection against server-side forgery attacks.
func NewExternalHttpClient(base *http.Client) *http.Client {
	// Ensure the base client's Transport is of type *http.Transport.
	var transport *http.Transport
	if t, ok := base.Transport.(*http.Transport); ok {
		// Clone the transport to avoid modifying the original.
		transport = t.Clone()
	} else {
		transport = http.DefaultTransport.(*http.Transport).Clone()
	}

	// Use the existing DialContext or create a default one.
	baseDialer := transport.DialContext
	if baseDialer == nil {
		dialer := &net.Dialer{Timeout: 30 * time.Second}
		baseDialer = dialer.DialContext
	}

	// Wrap the base dialer with our validation logic.
	transport.DialContext = validatedDialContext(baseDialer)

	// Create a new HTTP client using the customized transport.
	return &http.Client{
		Transport: transport,
		Timeout:   base.Timeout,
	}
}
