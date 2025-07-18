package node2nodeauth_test

import (
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/rpc/node2nodeauth"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
)

func TestEndToEnd(t *testing.T) {
	logger := logging.DefaultLogger(zap.DebugLevel)

	// Create a wallet
	ctx := test.NewTestContext(t)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	// Set up the HTTP server
	server := httptest.NewUnstartedServer(
		node2nodeauth.RequireCertMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})),
	)
	server.TLS = testcert.GetHttp2LocalhostTLSConfig(
		node2nodeauth.VerifyPeerCertificate(
			logger,
			func(addr common.Address) error {
				return nil
			},
		),
	)
	server.StartTLS()
	defer server.Close()

	// Create client with mTLS setup
	client, err := testcert.GetHttp2LocalhostTLSClientWithCert(
		ctx, nil, node2nodeauth.CertGetter(logger, wallet, big.NewInt(1)),
	)
	require.NoError(t, err)

	// Perform a request to the server
	resp, err := client.Get(server.URL)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// Create a client without mTLS
	client, err = testcert.GetHttp2LocalhostTLSClient(ctx, nil)
	require.NoError(t, err)

	// Perform a request to the server
	resp, err = client.Get(server.URL)
	require.NoError(t, err)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}
