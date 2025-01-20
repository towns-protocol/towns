package rpc

import (
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/node/crypto"
)

func (s *Service) initEthBalanceMetrics() {
	if s.baseChain == nil {
		return
	}

	go s.reportBaseEthMetric("node_base_eth", s.wallet.Address)

	nodeRecord, err := s.nodeRegistry.GetNode(s.wallet.Address)
	if err != nil {
		s.defaultLogger.Errorw("Failed to find own node record", "err", err)
		return
	}

	go s.reportBaseEthMetric("operator_base_eth", nodeRecord.Operator())
}

func (s *Service) reportBaseEthMetric(name string, address common.Address) {
	metric := s.metrics.NewGaugeVecEx(name, "Eth balance of the account on base chain", "address").
		WithLabelValues(address.Hex())

	// Report once on start
	balance, err := s.baseChain.Client.BalanceAt(s.serverCtx, address, nil)
	if err != nil {
		s.defaultLogger.Errorw("Unable to retrieve wallet balance from base", "err", err)
	} else {
		metric.Set(crypto.WeiToEth(balance))
	}

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.serverCtx.Done():
			return
		case <-ticker.C:
			balance, err = s.baseChain.Client.BalanceAt(s.serverCtx, address, nil)
			if err != nil {
				s.defaultLogger.Errorw("Unable to retrieve wallet balance from base", "err", err)
				continue
			}

			metric.Set(crypto.WeiToEth(balance))
		}
	}
}
