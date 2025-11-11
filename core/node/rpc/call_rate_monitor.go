package rpc

import (
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/rpc/abuse"
)

func newCallRateMonitorFromConfig(cfg config.AbuseDetectionConfig) abuse.CallRateMonitor {
	thresholds := make(map[abuse.CallType][]abuse.Threshold, len(cfg.Thresholds))
	for key, values := range cfg.Thresholds {
		callType := abuse.CallType(key)
		converted := make([]abuse.Threshold, 0, len(values))
		for _, value := range values {
			if value.Window <= 0 || value.Count == 0 {
				continue
			}
			converted = append(converted, abuse.Threshold{
				Window: value.Window,
				Count:  value.Count,
			})
		}
		if len(converted) > 0 {
			thresholds[callType] = converted
		}
	}

	return abuse.NewCallRateMonitor(abuse.Config{
		Enabled:    cfg.Enabled,
		MaxResults: cfg.MaxResults,
		Thresholds: thresholds,
	})
}

func (s *Service) recordCallRate(callType abuse.CallType, creator []byte) {
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
