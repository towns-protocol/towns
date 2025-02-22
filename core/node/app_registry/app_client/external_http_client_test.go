package app_client

import (
	"context"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// dummyConn is a stub implementation of net.Conn for testing.
type dummyConn struct{}

func (d *dummyConn) Read(b []byte) (n int, err error)   { return 0, nil }
func (d *dummyConn) Write(b []byte) (n int, err error)  { return len(b), nil }
func (d *dummyConn) Close() error                       { return nil }
func (d *dummyConn) LocalAddr() net.Addr                { return &net.TCPAddr{IP: net.ParseIP("127.0.0.1"), Port: 0} }
func (d *dummyConn) RemoteAddr() net.Addr               { return &net.TCPAddr{IP: net.ParseIP("127.0.0.1"), Port: 0} }
func (d *dummyConn) SetDeadline(t time.Time) error      { return nil }
func (d *dummyConn) SetReadDeadline(t time.Time) error  { return nil }
func (d *dummyConn) SetWriteDeadline(t time.Time) error { return nil }

// dummyDialer is a dial function that simply returns a dummy connection.
func dummyDialer(ctx context.Context, network, addr string) (net.Conn, error) {
	return &dummyConn{}, nil
}

func TestValidatedDialContext(t *testing.T) {
	tests := map[string]struct {
		address     string
		expectedErr error
	}{
		"localhost fails": {
			address:     "localhost:80",
			expectedErr: ErrCannotConnectToLoopbackAddress,
		},
		"127.0.0.1 fails": {
			address:     "127.0.0.1:443",
			expectedErr: ErrCannotConnectToLoopbackAddress,
		},
		"ipv6 [::1] fails": {
			address:     "[::1]:443",
			expectedErr: ErrCannotConnectToLoopbackAddress,
		},
		"private ip literal fails": {
			address:     "10.0.0.1:80",
			expectedErr: ErrCannotConnectToPrivateIp,
		},
		"invalid address fails": {
			address:     "invalid_address",
			expectedErr: fmt.Errorf("missing port in address"),
		},
		"outbound address succeeds": {
			address: "google.com:80",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			dialer := validatedDialContext(dummyDialer)

			// Address without a port is invalid.
			conn, err := dialer(context.Background(), "tcp", tc.address)

			if conn != nil {
				defer conn.Close()
			}

			if tc.expectedErr != nil {
				require.Nil(t, conn)
				require.ErrorContains(t, err, tc.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.NotNil(t, conn)
			}
		})
	}
}
