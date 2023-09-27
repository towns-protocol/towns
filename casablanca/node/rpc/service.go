package rpc

import (
	"casablanca/node/auth"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/nodes"
)

var (
	serviceRequests = infra.NewSuccessMetrics("service_requests", nil)
)

type Service struct {
	cache              events.StreamCache
	townsContract      auth.TownsContract
	walletLinkContract auth.WalletLinkContract
	wallet             *crypto.Wallet
	skipDelegateCheck  bool
	exitSignal         chan error
	nodeRegistry       nodes.NodeRegistry
	streamRegistry     nodes.StreamRegistry
}
