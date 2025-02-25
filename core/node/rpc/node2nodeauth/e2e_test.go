package node2nodeauth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/rpc/node2nodeauth"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
)

func TestEndToEnd(t *testing.T) {
	logger := zap.NewNop().Sugar()

	// Mock node registry
	nodeRegistry := mocks.NewMockNodeRegistry(t)

	// Create a wallet
	wallet, err := crypto.NewWallet(context.Background())
	assert.NoError(t, err)

	// Add the node to the registry
	nodeRegistry.On("GetNode", wallet.Address).Return(
		nodes.NewNodeRecord(wallet.Address, wallet.Address, "", river.NodeStatus_Operational, false, nil, nil),
		nil,
	)

	// Set up the HTTP server
	server := httptest.NewUnstartedServer(
		node2nodeauth.RequireCertMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})),
	)
	server.TLS = testcert.GetHttp2LocalhostTLSConfig(node2nodeauth.VerifyPeerCertificate(logger, nodeRegistry))
	server.StartTLS()
	defer server.Close()

	// Create client with mTLS setup
	client, err := testcert.GetHttp2LocalhostTLSClientWithCert(nil, nil, node2nodeauth.CertGetter(logger, wallet))
	assert.NoError(t, err)

	// Perform a request to the server
	resp, err := client.Get(server.URL)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Create a client without mTLS
	client, err = testcert.GetHttp2LocalhostTLSClient(nil, nil)
	assert.NoError(t, err)

	// Perform a request to the server
	resp, err = client.Get(server.URL)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}
