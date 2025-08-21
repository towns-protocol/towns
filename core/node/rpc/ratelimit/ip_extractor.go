package ratelimit

import (
	"context"
	"net"

	"connectrpc.com/connect"
)

// IPExtractor defines how to extract IP addresses from requests
type IPExtractor interface {
	ExtractIP(ctx context.Context, req connect.AnyRequest) (string, error)
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
func (e *ConnectIPExtractor) ExtractIP(ctx context.Context, req connect.AnyRequest) (string, error) {
	// Extract from RemoteAddr (format: "IP:port" or just "IP")
	if remoteAddr := getRemoteAddrFromContext(ctx); remoteAddr != "" {
		ip := parseIPFromAddr(remoteAddr)
		if ip != "" {
			return ip, nil
		}
	}

	// Fallback to localhost for internal/system calls
	return "127.0.0.1", nil
}


// parseIPFromAddr extracts IP from "IP:port" or just "IP" format
func parseIPFromAddr(addr string) string {
	if addr == "" {
		return ""
	}

	// Try parsing as "IP:port"
	if host, _, err := net.SplitHostPort(addr); err == nil {
		if net.ParseIP(host) != nil { // Validate it's a valid IP
			return host
		}
	}

	// Try parsing as just "IP"
	if net.ParseIP(addr) != nil { // Validate it's a valid IP
		return addr
	}
	
	return ""
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
	IP string
}

// NewMockIPExtractor creates a mock extractor that always returns the same IP
func NewMockIPExtractor(ip string) *MockIPExtractor {
	return &MockIPExtractor{
		IP: ip,
	}
}

// ExtractIP returns the configured mock IP
func (m *MockIPExtractor) ExtractIP(ctx context.Context, req connect.AnyRequest) (string, error) {
	if m.IP != "" {
		return m.IP, nil
	}
	return "127.0.0.1", nil
}