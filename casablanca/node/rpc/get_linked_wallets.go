package rpc

import (
	"context"
	"encoding/hex"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	. "casablanca/node/base"
	"casablanca/node/infra"
	. "casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/common"
)

var (
	getLinkedWallets = infra.NewSuccessMetrics("get_linked_wallets_requests", serviceRequests)
)

func (s *Service) GetLinkedWallets(ctx context.Context, req *connect_go.Request[GetLinkedWalletsRequest]) (*connect_go.Response[GetLinkedWalletsResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("GetLinkedWallets ENTER", "request", req.Msg)

	res, err := s.getLinkedWallets(ctx, log, req)
	if err != nil {
		log.Warn("GetLinkedWallets ERROR", "error", err)
		getLinkedWallets.Fail()
		return nil, err
	}
	log.Debug("GetLinkedWallets: DONE", "response", res.Msg)
	getLinkedWallets.Pass()
	return res, nil
}

func (s *Service) getLinkedWallets(ctx context.Context, log *slog.Logger, req *connect_go.Request[GetLinkedWalletsRequest]) (*connect_go.Response[GetLinkedWalletsResponse], error) {
	rootKeyId, err := hex.DecodeString(req.Msg.RootKeyId)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_ROOT_KEY_ID, err).Func("GetLinkedWallets").Message("error decoding root key id")
	}

	wallets, err := s.walletLinkContract.GetLinkedWallets(common.BytesToAddress(rootKeyId))
	if err != nil {
		return nil, WrapRiverError(Err_INTERNAL, err).Func("GetLinkedWallets").Message("error getting linked wallets")
	}

	var addresses []string
	for _, wallet := range wallets {
		addresses = append(addresses, string(common.BytesToAddress(wallet[:]).Hex()))
	}

	return &connect_go.Response[GetLinkedWalletsResponse]{Msg: &GetLinkedWalletsResponse{
		WalletAddresses: addresses,
	}}, nil
}
