package rpc

import (
	"context"
	"net/http"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	"casablanca/node/auth"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"
)

var (
	serviceRequests = infra.NewSuccessMetrics("service_requests", nil)
)

type Service struct {
	cache             events.StreamCache
	townsContract     auth.TownsContract
	wallet            *crypto.Wallet
	log               *slog.Logger
	skipDelegateCheck bool
}

func MakeServiceHandler(ctx context.Context, log *slog.Logger, dbUrl string, chainConfig *config.ChainConfig, wallet *crypto.Wallet, skipDelegateCheck bool, opts ...connect_go.HandlerOption) (string, http.Handler, error) {
	store, err := storage.NewPGEventStore(ctx, dbUrl, false)
	if err != nil {
		log.Error("failed to create storage", "error", err)
		return "", nil, err
	}

	if wallet == nil {
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		if err != nil {
			return "", nil, err
		}
	}

	var contract auth.TownsContract
	if chainConfig == nil {
		log.Warn("Using passthrough auth")
		contract = auth.NewTownsPassThrough()
	} else {
		log.Info("Using casablanca auth", "chain_config", chainConfig)
		contract, err = auth.NewTownsContract(chainConfig)
		if err != nil {
			log.Error("failed to create auth", "error", err)
			return "", nil, err
		}
	}

	s, h := protocolconnect.NewStreamServiceHandler(
		&Service{
			cache:             events.NewStreamCache(&events.StreamCacheParams{Storage: store, Wallet: wallet, DefaultCtx: ctx}),
			townsContract:     contract,
			wallet:            wallet,
			log:               log,
			skipDelegateCheck: skipDelegateCheck,
		},
		opts...,
	)
	return s, h, nil
}
