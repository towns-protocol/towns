package rpc

import (
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/rpc/highusage"
)

func newCallRateMonitorFromConfig(cfg config.HighUsageDetectionConfig, logger *zap.Logger) highusage.CallRateMonitor {
	return highusage.NewCallRateMonitor(cfg, logger)
}

func (s *Service) recordCallRate(callType highusage.CallType, creator []byte) {
	if s == nil || s.callRateMonitor == nil || len(creator) == 0 {
		return
	}

	addr := common.BytesToAddress(creator)
	if addr == (common.Address{}) {
		return
	}

	if s.wallet != nil && addr == s.wallet.Address {
		return
	}

	s.callRateMonitor.RecordCall(addr, time.Now(), callType)
}
