package testcert

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/http_client"
)

// LocalhostCertBytes is a PEM-encoded TLS cert with SAN IPs
// "127.0.0.1", "[::1]" and "localhost", expiring at Jan 29 16:00:00 2084 GMT.
// generated from go's stdlib crypto/tls:
// go run generate_cert.go  --rsa-bits 2048 --host 127.0.0.1,::1,localhost --ca --start-date "Jan 1 00:00:00 1970"
// --duration=1000000h
var LocalhostCertBytes = []byte(`-----BEGIN CERTIFICATE-----
MIIDNzCCAh+gAwIBAgIQAsnl2DcoPHijC6aEfZGmIDANBgkqhkiG9w0BAQsFADAS
MRAwDgYDVQQKEwdBY21lIENvMCAXDTcwMDEwMTAwMDAwMFoYDzIwODQwMTI5MTYw
MDAwWjASMRAwDgYDVQQKEwdBY21lIENvMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEA3Vtk2puIjOJUqWBXb+rZYc9Q5FBqgs1Yf/d755Kokh8FRF5AvNWP
/jQdhN4K755e+O/dKR9+1E78mRyQc4Px066/FNrF2KwTHb7ZnWycwQ9WZ9TcKqQn
FTZ1e3Dd6gyoAuM7At/L8UZRikKkRYea+6FFfNcv+xmjqq28/8BvdXEZ5BPg8LJP
5l+S9ADfnRsOQJc3qRqA/efMxWt90ob2Fb7f6sQi8+nvu/mNoJ29s2uES2ZnM+P+
BgfJGG1/JXs+BIHnb19+4fMTDEymkgGrxloxE6pyiaET+7UtXu2DWXps5RZXFK3r
SRoy15fyvp/AkMMV5667PUtYgn8fqZkejwIDAQABo4GGMIGDMA4GA1UdDwEB/wQE
AwICpDATBgNVHSUEDDAKBggrBgEFBQcDATAPBgNVHRMBAf8EBTADAQH/MB0GA1Ud
DgQWBBS6YYAoW7XwcFgU5jmh0+FdAxza5zAsBgNVHREEJTAjgglsb2NhbGhvc3SH
BH8AAAGHEAAAAAAAAAAAAAAAAAAAAAEwDQYJKoZIhvcNAQELBQADggEBAMUrANNg
8zlXJOTm+rz/XzFZU2S3SicmxcD+44pohcHkLiKoDX3qBEJ/hThGyhoWgM/87/1x
H6Trsfy3aw6t8nY1jsATSMHElLccr6GYpE8eNpeywvgV8ICe1RI844PvcbomBXiq
tTM7o9q61xQ9TmgXI2p0siOZDv+SHEa4ZcK0XR2/t0Ftg6mngsQipommoaqY0Anp
oXgjwriUHzi3C+GTdHULWM4jjdE/I22j5Px9JUTEp0MGZ3Ci1EE6/RlKRi+L/b/1
2JK7uZe3+fxnKOqwWHOsj75mz5yBZ3pHQGx4Nh+fJRbkYbMLVJCZBpWrETxVFUFw
fqebk+ZRYgZE2V8=
-----END CERTIFICATE-----`)

// LocalhostKeyBytes is the private key for LocalhostCertBytes.
var LocalhostKeyBytes = []byte(func() string {
	return strings.ReplaceAll(`-----BEGIN TEST KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDdW2Tam4iM4lSp
YFdv6tlhz1DkUGqCzVh/93vnkqiSHwVEXkC81Y/+NB2E3grvnl74790pH37UTvyZ
HJBzg/HTrr8U2sXYrBMdvtmdbJzBD1Zn1NwqpCcVNnV7cN3qDKgC4zsC38vxRlGK
QqRFh5r7oUV81y/7GaOqrbz/wG91cRnkE+Dwsk/mX5L0AN+dGw5AlzepGoD958zF
a33ShvYVvt/qxCLz6e+7+Y2gnb2za4RLZmcz4/4GB8kYbX8lez4EgedvX37h8xMM
TKaSAavGWjETqnKJoRP7tS1e7YNZemzlFlcUretJGjLXl/K+n8CQwxXnrrs9S1iC
fx+pmR6PAgMBAAECggEAVqAAjOhW/MNJ3GrebObcIUHPZzntJLkVjCaer5YeL+jB
1+qGrR9qVVGxx6BZaUJx6jt8Mi6oJI+wnH6oLPySs4NsNc4TpOJaLMbWRJwPkCHf
b4zGiE1rGgsQ2Ljnr0M6sL6aBlrsZcRd/pxryuXxic2n8t4HYd27xfxtvSxisfNR
bHBEmE35d+a0BEpp3KfTmR7LSFgKDRa9xzuMVCBnjwmEUaDTIxg75t/SRSIGk9mH
CfSchJuuyNyKzbzTnKj/jLfI5KS3xCQkFfypTSvjPJORiS1yT72nyPt0GJg7+5oM
VudIoKEKHJNUPzHRaiHiygFR27LP3mJTHEc0vDZbSQKBgQDjn0ErbOlql2wnBAds
QmaGfQusrphjLBjC2LONbBAxaTe86QwI59ofwuZJVJiq6CyVzdM1lixevBNFk3Iv
xcJWq5GAZ2Mtu26sZ+yK65gWvdNMgTlGEcLCnOsVf5q86OcOL7ldDE6JsUlXhFmW
PpYQ1WwjZCSWAVkRD57sy6U+LQKBgQD49C8ospVIY0MJSeAECbobiHg5bUjJrDrV
CsKVev0qJzjMCPHHOFEaQWe9gT/HTcPg7jtM6ezj96SakweS9Hkb1XoiLF9pNSvU
zv1dzN6z+1piKfvqAiUXuEC29bV8914tnnqd8VF4J8wOrPfdWqS7ioxSGSDX1ZUY
YQ4qB2+BKwKBgCrqJ5tMWWWjTty8QboDetj4Um8oK8rm0XRK7u9G5HasY7nWJlK3
g8RhNpG0xWPTijRkLeH4gj0KMIf5mJmxK0az6ibPVz+UCvWuUkaOzIndGC1gX6/6
QUH328qd2EqtjoJ6NPR6EYScTDuX1FwjSJ+73Tt+8fbmIii5TTlP28OxAoGAQVVb
1vNe5/tcyWBA0O54j+c1neSHOJ3hZq2HOVFohRp79lfWk7C84AYQIpR712MaJ7p9
h4bQa1c/NG2njDJqYhqZDcTVWTfiA9w6c9ZjD5rEMoTQHq5na50oJpu/AEeuyIwR
o8eD2OOg0q0j80xpdOo8PwNnMh1UHmzCGdePtLcCgYAMpVjoRXsXwVQFR/c7Bs75
/ym2se2mc2qXjxVpOb+uOLbqz4Q9IOb6QQIs8pJQVSCTbtaHnx7EuC0kaSAzJ8Xv
bxtilS632LvNH26b/cglwebFWhtLzTnK5a8WGmOAnf7fwbfcnpGnkvt1sCq91UjV
vPxTR4f4L6WHP3HADEB/og==
-----END TEST KEY-----`,
		"TEST KEY",
		"PRIVATE KEY",
	)
}())

var LocalhostCert = func() tls.Certificate {
	cert, err := tls.X509KeyPair(LocalhostCertBytes, LocalhostKeyBytes)
	if err != nil {
		panic(err)
	}
	return cert
}()

var LocalhostCertPool = func() *x509.CertPool {
	certpool := x509.NewCertPool()
	if LocalhostCert.Leaf == nil {
		panic("LocalhostCert.Leaf is nil")
	}
	certpool.AddCert(LocalhostCert.Leaf)
	return certpool
}()

func GetHttp2LocalhostTLSConfig(verify func([][]byte, [][]*x509.Certificate) error) *tls.Config {
	return &tls.Config{
		Certificates:          []tls.Certificate{LocalhostCert},
		NextProtos:            []string{"h2"},
		ClientAuth:            tls.RequestClientCert,
		VerifyPeerCertificate: verify,
	}
}

func GetHttp2LocalhostTLSClient(ctx context.Context, cfg *config.Config) (*http.Client, error) {
	return GetHttp2LocalhostTLSClientWithCert(ctx, cfg, nil)
}

func GetHttp2LocalhostTLSClientWithCert(
	_ context.Context,
	_ *config.Config,
	getCert http_client.GetClientCertFunc,
) (*http.Client, error) {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				RootCAs:              LocalhostCertPool,
				GetClientCertificate: getCert,
			},

			// Node-2-node connections to local nodes in tests sometimes seem to hang if the
			// local node is down, although they do terminate when the http service is torn down.
			// This setting limits the duration of attempting to establish a connection to
			// another node.
			DialContext: (&net.Dialer{
				Timeout:   2 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,

			// ForceAttemptHTTP2 ensures the transport negotiates HTTP/2 if possible.
			// This allows us to use the http.Transport, whose DialContext timeout is
			// respected by the service.
			ForceAttemptHTTP2: true,
		},
	}, nil
}

// MakeTestListener creates a TLS-configured localhost listener on a random port and and
// validates proper listener creation. It does not clean up the listener on test close.
func MakeTestListener(t *testing.T, verify func([][]byte, [][]*x509.Certificate) error) (net.Listener, string) {
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	listener = tls.NewListener(listener, GetHttp2LocalhostTLSConfig(verify))
	return listener, "https://" + listener.Addr().String()
}
