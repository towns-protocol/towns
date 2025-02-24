package rpc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/rpc/render"
	"github.com/towns-protocol/towns/core/node/rpc/statusinfo"
	"github.com/towns-protocol/towns/core/river_node/version"
)

func (s *Service) blockchainPingWithClient(
	ctx context.Context,
	expectedChainId uint64,
	client crypto.BlockchainClient,
) *statusinfo.BlockchainPing {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	var blockNum uint64
	var chainId *big.Int = new(big.Int)
	var blockErr, chainErr error
	var latency string
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		defer wg.Done()
		start := time.Now()
		blockNum, blockErr = client.BlockNumber(ctx)
		latency = time.Since(start).String()
	}()
	go func() {
		defer wg.Done()
		chainId, chainErr = client.ChainID(ctx)
	}()

	wg.Wait()

	if blockErr != nil || chainErr != nil {
		var errStr string
		if blockErr != nil {
			errStr = "FAIL: " + blockErr.Error()
		} else {
			errStr = "FAIL: " + chainErr.Error()
		}
		if len(errStr) > 80 {
			errStr = errStr[:80]
		}
		return &statusinfo.BlockchainPing{
			Result:  errStr,
			ChainId: expectedChainId,
			Latency: latency,
		}
	}

	if chainId.Uint64() != expectedChainId {
		return &statusinfo.BlockchainPing{
			Result:  fmt.Sprintf("FAIL: Chain ID mismatch. Expected %d, got %d", expectedChainId, chainId.Uint64()),
			ChainId: expectedChainId,
			Latency: latency,
		}
	}

	return &statusinfo.BlockchainPing{
		Result:  "OK",
		ChainId: expectedChainId,
		Block:   blockNum,
		Latency: latency,
	}
}

func (s *Service) blockchainPingWithUrl(
	ctx context.Context,
	chainId uint64,
	url string,
) *statusinfo.BlockchainPing {
	client, err := ethclient.DialContext(ctx, url)
	if err != nil {
		return &statusinfo.BlockchainPing{
			Result:  "FAIL: " + err.Error(),
			ChainId: chainId,
		}
	}
	return s.blockchainPingWithClient(ctx, chainId, client)
}

func (s *Service) getStatusResponse(ctx context.Context, url *url.URL) (*statusinfo.StatusResponse, int) {
	// blockchain=0 - do not query blockchain providers
	// blockchain= (not set or empty) - query and include result in json
	// blockchain=1 - query, include result in json and 503 if not available
	var bc string
	if url != nil {
		bc = url.Query().Get("blockchain")
	}

	var riverPing *statusinfo.BlockchainPing
	var basePing *statusinfo.BlockchainPing
	var otherChainsPing []statusinfo.BlockchainPing
	var mu sync.Mutex
	status := http.StatusOK
	if bc == "" || bc == "1" {
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			riverPing = s.blockchainPingWithClient(ctx, s.riverChain.ChainId.Uint64(), s.riverChain.Client)
			wg.Done()
		}()
		go func() {
			if s.baseChain != nil {
				basePing = s.blockchainPingWithClient(ctx, s.baseChain.ChainId.Uint64(), s.baseChain.Client)
			}
			wg.Done()
		}()

		for _, chain := range s.config.ChainConfigs {
			if s.riverChain != nil && chain.ChainId == s.riverChain.ChainId.Uint64() {
				continue
			}
			if s.baseChain != nil && chain.ChainId == s.baseChain.ChainId.Uint64() {
				continue
			}

			wg.Add(1)
			go func(chain *config.ChainConfig) {
				defer wg.Done()
				chainPing := s.blockchainPingWithUrl(ctx, chain.ChainId, chain.NetworkUrl)
				mu.Lock()
				defer mu.Unlock()
				otherChainsPing = append(otherChainsPing, *chainPing)
			}(chain)
		}
		wg.Wait()
		if bc == "1" {
			if riverPing != nil && riverPing.Result != "OK" {
				status = http.StatusServiceUnavailable
			}
			if basePing != nil && basePing.Result != "OK" {
				status = http.StatusServiceUnavailable
			}
			for _, chainPing := range otherChainsPing {
				if chainPing.Result != "OK" {
					status = http.StatusServiceUnavailable
				}
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
		Status:            statusStr,
		InstanceId:        s.instanceId,
		Address:           addr,
		Version:           version.GetFullVersion(),
		StartTime:         s.startTime.UTC().Format(time.RFC3339),
		Uptime:            time.Since(s.startTime).String(),
		Graffiti:          s.config.GetGraffiti(),
		River:             riverPing,
		Base:              basePing,
		OtherChains:       otherChainsPing,
		XChainBlockchains: s.chainConfig.Get().XChain.Blockchains,
	}, status
}

func (s *Service) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	result, status := s.getStatusResponse(r.Context(), r.URL)
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(result)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *Service) handleInfo(w http.ResponseWriter, r *http.Request) {
	var output *bytes.Buffer

	result, status := s.getStatusResponse(r.Context(), r.URL)
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
