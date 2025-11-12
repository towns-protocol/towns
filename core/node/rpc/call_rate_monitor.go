package rpc

import (
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/rpc/highusage"
)

func newCallRateMonitorFromConfig(cfg config.HighUsageDetectionConfig, logger *zap.Logger) highusage.CallRateMonitor {
	thresholds := make(map[highusage.CallType][]highusage.Threshold, len(cfg.Thresholds))
	for key, values := range cfg.Thresholds {
		callType := highusage.CallType(key)
		converted := make([]highusage.Threshold, 0, len(values))
		for _, value := range values {
			if value.Window <= 0 || value.Count == 0 {
				continue
			}
			converted = append(converted, highusage.Threshold{
				Window: value.Window,
				Count:  value.Count,
			})
		}
		if len(converted) > 0 {
			thresholds[callType] = converted
		}
	}

	return highusage.NewCallRateMonitor(highusage.Config{
		Enabled:    cfg.Enabled,
		MaxResults: cfg.MaxResults,
		Thresholds: thresholds,
		Logger:     logger,
	})
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
