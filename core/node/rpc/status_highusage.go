package rpc

import (
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/rpc/highusage"
	"github.com/towns-protocol/towns/core/node/rpc/statusinfo"
)

func convertHighUsageInfo(entries []highusage.HighUsageInfo) []statusinfo.HighUsageInfo {
	if len(entries) == 0 {
		return nil
	}

	result := make([]statusinfo.HighUsageInfo, 0, len(entries))
	for _, entry := range entries {
		addr := entry.User
		user := addr.Hex()
		if addr == (common.Address{}) {
			user = ""
		}
		violations := make([]statusinfo.ViolationInfo, 0, len(entry.Violations))
		for _, v := range entry.Violations {
			violations = append(violations, statusinfo.ViolationInfo{
				Window: v.Window.String(),
				Count:  v.Count,
				Limit:  v.Limit,
			})
		}
		result = append(result, statusinfo.HighUsageInfo{
			User:       user,
			CallType:   string(entry.CallType),
			LastSeen:   entry.LastSeen.UTC().Format(time.RFC3339),
			Violations: violations,
		})
	}
	return result
}
