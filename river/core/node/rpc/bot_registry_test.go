package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"testing"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"github.com/river-build/river/core/node/testutils/testcert"
)

func initBotRegistryService(
	ctx context.Context,
	tester *serviceTester,
) (botRegistry *Service, url string) {
	bc := tester.btc.NewWalletAndBlockchain(tester.ctx)
	listener, url := makeTestListener(tester.t)
	config := tester.getConfig()
	config.BotRegistry.BotRegistryId = base.GenShortNanoid()
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("service", "bot-registry"))
	botRegistry, err := StartServerInBotRegistryMode(
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

	return botRegistry, url
}

// invalidAddressBytes is a slice of bytes that cannot be parsed into an address, because
// it is too long. Valid addresses are 20 bytes.
var invalidAddressBytes = bytes.Repeat([]byte("a"), 21)

func TestBotRegistry(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service, _ := initBotRegistryService(tester.ctx, tester)

	var unregisteredBot common.Address
	_, err := rand.Read(unregisteredBot[:])
	tester.require.NoError(err)

	// TODO: bot and bot owner need to authenticate for the RegisterWebhook endpoint
	botWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)
	ownerWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)

	resp, err := service.BotRegistryService.RegisterWebhook(
		tester.ctx,
		&connect.Request[protocol.RegisterWebhookRequest]{
			Msg: &protocol.RegisterWebhookRequest{
				BotId:      botWallet.Address[:],
				BotOwnerId: ownerWallet.Address[:],
				WebhookUrl: "localhost:1234/abc",
			},
		},
	)

	tester.require.NoError(err)
	tester.require.NotNil(resp)

	resp, err = service.BotRegistryService.RegisterWebhook(
		tester.ctx,
		&connect.Request[protocol.RegisterWebhookRequest]{
			Msg: &protocol.RegisterWebhookRequest{
				BotId:      invalidAddressBytes[:],
				BotOwnerId: ownerWallet.Address[:],
				WebhookUrl: "localhost:1234/abc",
			},
		},
	)
	tester.require.Nil(resp)
	tester.require.ErrorContains(err, "Invalid bot id")
	tester.require.True(base.IsRiverErrorCode(err, protocol.Err_BAD_ADDRESS))

	status, err := service.BotRegistryService.GetStatus(
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

	status, err = service.BotRegistryService.GetStatus(
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
