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
	cache         events.StreamCache
	Authorization auth.Authorization
	wallet        *crypto.Wallet
	log           *slog.Logger
}

func MakeServiceHandler(ctx context.Context, log *slog.Logger, dbUrl string, chainConfig *config.ChainConfig, opts ...connect_go.HandlerOption) (string, http.Handler, error) {
	store, err := storage.NewPGEventStore(ctx, dbUrl, false)
	if err != nil {
		log.Error("failed to create storage", "error", err)
		return "", nil, err
	}

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		log.Error("failed to create wallet", "error", err)
		return "", nil, err
	}

	var authorization auth.Authorization
	if chainConfig == nil {
		log.Warn("Using passthrough auth")
		authorization = auth.NewPassthroughAuth()
	} else {
		log.Info("Using casablanca auth", "chain_config", chainConfig)
		authorization, err = auth.NewChainAuth(chainConfig)
		if err != nil {
			log.Error("failed to create auth", "error", err)
			return "", nil, err
		}
	}

	s, h := protocolconnect.NewStreamServiceHandler(
		&Service{
			cache:         events.NewStreamCache(store),
			Authorization: authorization,
			wallet:        wallet,
			log:           log,
		},
		opts...,
	)
	return s, h, nil
}
