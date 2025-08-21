package ratelimit

import (
	"context"
	"net"

	"connectrpc.com/connect"
)

// IPExtractor defines how to extract IP addresses from requests
type IPExtractor interface {
	ExtractIP(ctx context.Context, req connect.AnyRequest) (net.IP, error)
}

// ConnectIPExtractor extracts IP addresses from Connect requests
type ConnectIPExtractor struct {
	// No configuration needed - always extracts from RemoteAddr
}

// NewConnectIPExtractor creates a new IP extractor
func NewConnectIPExtractor() *ConnectIPExtractor {
	return &ConnectIPExtractor{}
}

// ExtractIP extracts the client IP address from a Connect request
func (e *ConnectIPExtractor) ExtractIP(ctx context.Context, req connect.AnyRequest) (net.IP, error) {
	// Extract from RemoteAddr (format: "IP:port" or just "IP")
	if remoteAddr := getRemoteAddrFromContext(ctx); remoteAddr != "" {
		ip := parseIPFromAddr(remoteAddr)
		if ip != nil {
			return ip, nil
		}
	}

	// Fallback to localhost for internal/system calls
	return net.ParseIP("127.0.0.1"), nil
}


// parseIPFromAddr extracts IP from "IP:port" or just "IP" format
func parseIPFromAddr(addr string) net.IP {
	if addr == "" {
		return nil
	}

	// Try parsing as "IP:port"
	if host, _, err := net.SplitHostPort(addr); err == nil {
		return net.ParseIP(host)
	}

	// Try parsing as just "IP"
	return net.ParseIP(addr)
}

// getRemoteAddrFromContext attempts to extract remote address from context
// This is a placeholder implementation - the actual implementation would depend
// on how the Connect framework exposes peer information
func getRemoteAddrFromContext(ctx context.Context) string {
	// TODO: Replace with actual Connect peer extraction
	// This would typically involve looking at context values set by the Connect framework
	// For now, return empty string which will fallback to localhost
	return ""
}

// MockIPExtractor is a simple extractor for testing
type MockIPExtractor struct {
	IP net.IP
}

// NewMockIPExtractor creates a mock extractor that always returns the same IP
func NewMockIPExtractor(ip string) *MockIPExtractor {
	return &MockIPExtractor{
		IP: net.ParseIP(ip),
	}
}

// ExtractIP returns the configured mock IP
func (m *MockIPExtractor) ExtractIP(ctx context.Context, req connect.AnyRequest) (net.IP, error) {
	if m.IP != nil {
		return m.IP, nil
	}
	return net.ParseIP("127.0.0.1"), nil
}