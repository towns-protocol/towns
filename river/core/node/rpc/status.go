package rpc

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/node/version"
	"github.com/river-build/river/core/node/rpc/render"
	"github.com/river-build/river/core/node/rpc/statusinfo"
)

func (s *Service) blockchainPing(ctx context.Context, chain *crypto.Blockchain) *statusinfo.BlockchainPing {
	if chain == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	start := time.Now()
	blockNum, err := chain.Client.BlockNumber(ctx)
	latency := time.Since(start).String()

	if err != nil {
		errStr := "FAIL: " + err.Error()
		if len(errStr) > 80 {
			errStr = errStr[0:80]
		}
		return &statusinfo.BlockchainPing{
			Result:  errStr,
			ChainId: chain.ChainId.Uint64(),
			Latency: latency,
		}
	}

	return &statusinfo.BlockchainPing{
		Result:  "OK",
		ChainId: chain.ChainId.Uint64(),
		Block:   blockNum,
		Latency: latency,
	}
}

func (s *Service) getStatusReponse(ctx context.Context, url *url.URL) (*statusinfo.StatusResponse, int) {
	// blockchain=0 - do not query blockchain providers
	// blockchain= (not set or empty) - query and include result in json
	// blockchain=1 - query, include result in json and 503 if not available
	var bc string
	if url != nil {
		bc = url.Query().Get("blockchain")
	}

	var riverPing *statusinfo.BlockchainPing
	var basePing *statusinfo.BlockchainPing
	status := http.StatusOK
	if bc == "" || bc == "1" {
		riverPing = s.blockchainPing(ctx, s.riverChain)
		basePing = s.blockchainPing(ctx, s.baseChain)
		if bc == "1" {
			if riverPing != nil && riverPing.Result != "OK" {
				status = http.StatusServiceUnavailable
			}
			if basePing != nil && basePing.Result != "OK" {
				status = http.StatusServiceUnavailable
			}
		}
	}

	var addr string
	if s.wallet != nil {
		addr = s.wallet.Address.Hex()
	}
	statusStr := s.GetStatus()
	if status != http.StatusOK {
		statusStr = "UNAVAILABLE"
	}
	return &statusinfo.StatusResponse{
		Status:     statusStr,
		InstanceId: s.instanceId,
		Address:    addr,
		Version:    version.GetFullVersion(),
		StartTime:  s.startTime.UTC().Format(time.RFC3339),
		Uptime:     time.Since(s.startTime).String(),
		Graffiti:   s.config.GetGraffiti(),
		River:      riverPing,
		Base:       basePing,
	}, status
}

func (s *Service) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	result, status := s.getStatusReponse(r.Context(), r.URL)
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(result)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *Service) handleInfo(w http.ResponseWriter, r *http.Request) {
	var output *bytes.Buffer

	result, status := s.getStatusReponse(r.Context(), r.URL)
	json, err := json.MarshalIndent(result, "", "  ")
	if err == nil {
		output, err = render.Execute(&render.InfoIndexData{Status: status, StatusJson: string(json)})
	}
	if err != nil {
		s.defaultLogger.Error("unable to prepare info index response", "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(status)
	_, _ = io.Copy(w, output)
}
