package rpc

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/river-build/river/core/node/node/version"
)

type StatusResponse struct {
	Status     string `json:"status"`
	InstanceId string `json:"instance_id"`
	Address    string `json:"address"`
	Version    string `json:"version"`
	StartTime  string `json:"start_time"`
	Uptime     string `json:"uptime"`
}

func (s *Service) handleStatus(w http.ResponseWriter, r *http.Request) {
	response := StatusResponse{
		Status:     s.GetStatus(),
		InstanceId: s.instanceId,
		Address:    s.wallet.Address.Hex(),
		Version:    version.GetFullVersion(),
		StartTime:  s.startTime.UTC().Format(time.RFC3339),
		Uptime:     time.Since(s.startTime).String(),
	}
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(response)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
