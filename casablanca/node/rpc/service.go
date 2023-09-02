package rpc

import (
	"context"
	"net/http"
	"strings"

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
	townsContract auth.TownsContract
	// keep it separate as it lives in the top-chain
	walletLinkContract auth.WalletLinkContract
	wallet             *crypto.Wallet
	log                *slog.Logger
	skipDelegateCheck  bool
}

func MakeServiceHandler(ctx context.Context, log *slog.Logger, dbUrl string, storageType string, chainConfig *config.ChainConfig, topChainConfig *config.ChainConfig, wallet *crypto.Wallet, skipDelegateCheck bool, opts ...connect_go.HandlerOption) (string, http.Handler, error) {
	var err error
	if wallet == nil {
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		if err != nil {
			return "", nil, err
		}
	}

	var store storage.StreamStorage
	if storageType == "in-memory" {
		store = storage.NewMemStorage()
	} else {
		store, err = storage.NewPostgresEventStore(ctx, dbUrl, "s"+strings.ToLower(wallet.Address.String()), true)
		if err != nil {
			log.Error("failed to create storage", "error", err)
			return "", nil, err
		}
	}

	var townsContract auth.TownsContract
	if chainConfig == nil {
		log.Warn("Using passthrough auth")
		townsContract = auth.NewTownsPassThrough()
	} else {
		log.Info("Using casablanca auth", "chain_config", chainConfig)
		townsContract, err = auth.NewTownsContract(chainConfig)
		if err != nil {
			log.Error("failed to create auth", "error", err)
			return "", nil, err
		}
	}

	var walletLinkContract auth.WalletLinkContract
	if topChainConfig == nil {
		log.Warn("Using no-op wallet linking contract")
		walletLinkContract = nil
	} else {
		log.Info("Using wallet link contract on", "chain_config", topChainConfig)
		walletLinkContract, err = auth.NewTownsWalletLink(topChainConfig, wallet)
		if err != nil {
			log.Error("failed to create wallet link contract", "error", err)
			return "", nil, err
		}
	}

	s, h := protocolconnect.NewStreamServiceHandler(
		&Service{
			cache: events.NewStreamCache(
				&events.StreamCacheParams{
					Storage:    store,
					Wallet:     wallet,
					DefaultCtx: ctx,
				},
			),
			townsContract:      townsContract,
			walletLinkContract: walletLinkContract,
			wallet:             wallet,
			log:                log,
			skipDelegateCheck:  skipDelegateCheck,
		},
		opts...,
	)
	return s, h, nil
}
