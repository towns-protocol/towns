package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"testing"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/node/authentication"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"github.com/river-build/river/core/node/testutils/testcert"
)

func authenticateBS[T any](
	ctx context.Context,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	primaryWallet *crypto.Wallet,
	request *connect.Request[T],
) {
	authentication.Authenticate(
		ctx,
		"BS_AUTH:",
		req,
		authClient,
		primaryWallet,
		request,
	)
}

func initBotRegistryService(
	ctx context.Context,
	tester *serviceTester,
) (botRegistry *Service) {
	bc := tester.btc.NewWalletAndBlockchain(tester.ctx)
	listener, _ := makeTestListener(tester.t)

	var key [32]byte
	_, err := rand.Read(key[:])
	tester.require.NoError(err)

	config := tester.getConfig()
	config.BotRegistry.BotRegistryId = base.GenShortNanoid()

	config.BotRegistry.Authentication.SessionToken.Key.Algorithm = "HS256"
	config.BotRegistry.Authentication.SessionToken.Key.Key = hex.EncodeToString(key[:])

	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("service", "bot-registry"))
	botRegistry, err = StartServerInBotRegistryMode(
		ctx,
		config,
		&ServerStartOpts{
			RiverChain:      bc,
			Listener:        listener,
			HttpClientMaker: testcert.GetHttp2LocalhostTLSClient,
		},
	)
	tester.require.NoError(err)

	// Clean up schema
	tester.cleanup(func() {
		err := dbtestutils.DeleteTestSchema(
			context.Background(),
			tester.dbUrl,
			storage.DbSchemaNameForBotRegistryService(config.BotRegistry.BotRegistryId),
		)
		tester.require.NoError(err)
	})
	tester.cleanup(botRegistry.Close)

	return botRegistry
}

// invalidAddressBytes is a slice of bytes that cannot be parsed into an address, because
// it is too long. Valid addresses are 20 bytes.
var invalidAddressBytes = bytes.Repeat([]byte("a"), 21)

func safeNewWallet(ctx context.Context, require *require.Assertions) *crypto.Wallet {
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	return wallet
}

func TestBotRegistry_RegisterWebhookAuthentication(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service := initBotRegistryService(tester.ctx, tester)

	botWallet := safeNewWallet(tester.ctx, tester.require)
	ownerWallet := safeNewWallet(tester.ctx, tester.require)
	bot2Wallet := safeNewWallet(tester.ctx, tester.require)
	owner2Wallet := safeNewWallet(tester.ctx, tester.require)
	bot3Wallet := safeNewWallet(tester.ctx, tester.require)
	owner3Wallet := safeNewWallet(tester.ctx, tester.require)
	unrelatedWallet := safeNewWallet(tester.ctx, tester.require)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())

	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	botRegistryClient := protocolconnect.NewBotRegistryServiceClient(
		httpClient, serviceAddr,
	)

	req := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			BotId:      botWallet.Address[:],
			BotOwnerId: ownerWallet.Address[:],
			WebhookUrl: "localhost:1234/abc",
		},
	}

	// Unauthenticated request should fail
	resp, err := botRegistryClient.RegisterWebhook(
		tester.ctx,
		req,
	)

	tester.require.ErrorContains(
		err,
		"missing session token",
	)
	tester.require.Nil(resp)

	// Request authenticated by bot should succeed
	authenticateBS(tester.ctx, tester.require, authClient, botWallet, req)
	resp, err = botRegistryClient.RegisterWebhook(
		tester.ctx,
		req,
	)
	tester.require.NoError(err)
	tester.require.NotNil(resp)

	// Request authenticated by bot owner should succeed
	req = &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			BotId:      bot2Wallet.Address[:],
			BotOwnerId: owner2Wallet.Address[:],
			WebhookUrl: "localhost:1234/abc",
		},
	}
	authenticateBS(tester.ctx, tester.require, authClient, owner2Wallet, req)

	resp, err = botRegistryClient.RegisterWebhook(
		tester.ctx,
		req,
	)
	tester.require.NoError(err)
	tester.require.NotNil(resp)

	// Request authenticated by neither the bot or bot owner should fail
	req = &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			BotId:      bot3Wallet.Address[:],
			BotOwnerId: owner3Wallet.Address[:],
			WebhookUrl: "localhost:1234/abc",
		},
	}
	authenticateBS(tester.ctx, tester.require, authClient, unrelatedWallet, req)

	resp, err = botRegistryClient.RegisterWebhook(
		tester.ctx,
		req,
	)
	tester.require.ErrorContains(err, "Registering user is neither bot nor owner")
	tester.require.Nil(resp)
}

func TestBotRegistry(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service := initBotRegistryService(tester.ctx, tester)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	botRegistryClient := protocolconnect.NewBotRegistryServiceClient(
		httpClient, serviceAddr,
	)

	var unregisteredBot common.Address
	_, err := rand.Read(unregisteredBot[:])
	tester.require.NoError(err)

	botWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)
	ownerWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)

	req := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			BotId:      botWallet.Address[:],
			BotOwnerId: ownerWallet.Address[:],
			WebhookUrl: "localhost:1234/abc",
		},
	}
	authenticateBS(tester.ctx, tester.require, authClient, botWallet, req)
	resp, err := botRegistryClient.RegisterWebhook(
		tester.ctx, req,
	)

	tester.require.NoError(err)
	tester.require.NotNil(resp)

	req = &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			BotId:      invalidAddressBytes,
			BotOwnerId: ownerWallet.Address[:],
			WebhookUrl: "localhost:1234/abc",
		},
	}
	authenticateBS(tester.ctx, tester.require, authClient, botWallet, req)
	resp, err = botRegistryClient.RegisterWebhook(
		tester.ctx,
		req,
	)
	tester.require.Nil(resp)
	tester.require.ErrorContains(err, "Invalid bot id")

	status, err := botRegistryClient.GetStatus(
		tester.ctx,
		&connect.Request[protocol.GetStatusRequest]{
			Msg: &protocol.GetStatusRequest{
				BotId: botWallet.Address[:],
			},
		},
	)
	tester.require.NoError(err)
	tester.require.NotNil(status)
	tester.require.True(status.Msg.IsRegistered)

	status, err = botRegistryClient.GetStatus(
		tester.ctx,
		&connect.Request[protocol.GetStatusRequest]{
			Msg: &protocol.GetStatusRequest{
				BotId: unregisteredBot[:],
			},
		},
	)
	tester.require.NoError(err)
	tester.require.NotNil(status)
	tester.require.False(status.Msg.IsRegistered)
}
