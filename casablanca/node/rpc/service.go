package rpc

import (
	"context"
	"net/http"

	connect_go "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"

	"casablanca/node/auth"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"
)

var (
	serviceRequests = infra.NewSuccessMetrics("service_requests", nil)
)

type Service struct {
	Storage       storage.Storage
	Authorization auth.Authorization
	wallet        *crypto.Wallet
}

func MakeServiceHandler(ctx context.Context, dbUrl string, chainConfig *config.ChainConfig, opts ...connect_go.HandlerOption) (string, http.Handler) {
	store, err := storage.NewPGEventStore(ctx, dbUrl, false)
	if err != nil {
		log.Fatalf("failed to create storage: %v", err)
	}

	wallet, err := crypto.NewWallet()
	if err != nil {
		log.Fatalf("failed to create wallet: %v", err)
	}

	var authorization auth.Authorization
	if chainConfig == nil {
		log.Infof("Using passthrough auth")
		authorization = auth.NewPassthroughAuth()
	} else {
		log.Infof("Using casablanca auth with chain config: %v", chainConfig)
		authorization, err = auth.NewChainAuth(chainConfig)
		if err != nil {
			log.Fatalf("failed to create auth: %v", err)
		}
	}

	return protocolconnect.NewStreamServiceHandler(
		&Service{
			Storage:       store,
			Authorization: authorization,
			wallet:        wallet,
		},
		opts...,
	)
}

func (s *Service) makeEnvelopeWithPayload(payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) (*protocol.Envelope, error) {
	return events.MakeEnvelopeWithPayload(s.wallet, payload, prevHashes)
}

func makeView(ctx context.Context, store storage.Storage, streamId string) storage.StreamView {
	view := storage.NewView(func() ([]*protocol.Envelope, error) {
		_, events, err := store.GetStream(ctx, streamId)
		if err != nil {
			return nil, err
		}
		return events, nil
	})
	return view
}
