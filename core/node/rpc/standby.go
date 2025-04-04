package rpc

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/towns-protocol/towns/core/node/rpc/statusinfo"
)

func (s *Service) standby() error {
	ctx := s.serverCtx
	log := s.defaultLogger

	s.SetStatus("STANDBY")

	pollPeriod := s.config.StandByPollPeriod
	if pollPeriod <= 0 {
		pollPeriod = 500 * time.Millisecond
	}

	log.Infow("Standby: entering standby mode", "poll_period", pollPeriod)

	// In a loop, query JSON from /status and exit when returned instanceId is matching local instanceId.
	// This means that routing has been switched to this instance.
	for first := true; ; first = false {
		if !first {
			time.Sleep(pollPeriod)
		}

		// TODO: make here client with disabled keep-alive.
		client, err := s.httpClientMaker(ctx, s.config)
		if err != nil {
			return err
		}
		client.Timeout = s.config.Network.GetHttpRequestTimeout()

		localNode, err := s.nodeRegistry.GetNode(s.wallet.Address)
		if err != nil {
			return err
		}
		url := localNode.Url() + "/status"

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return err
		}

		log.Infow("Standby: fetching status", "url", url)

		if s.standbyFetchStatus(req, client) {
			return nil
		}
	}
}

func (s *Service) standbyFetchStatus(req *http.Request, client *http.Client) bool {
	ctx := s.serverCtx
	log := s.defaultLogger

	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req.WithContext(ctx))
	if err != nil {
		log.Warnw("Standby: failed to fetch status, retrying...", "error", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Warnw("Standby: status code is not 200, retrying...", "status_code", resp.StatusCode)
		return false
	}

	var status statusinfo.StatusResponse
	err = json.NewDecoder(resp.Body).Decode(&status)
	if err != nil {
		log.Warnw("Standby: failed to decode JSON, retrying...", "error", err)
		return false
	}

	if status.InstanceId != s.instanceId {
		log.Infow(
			"Standby: instanceId is not matching, retrying...",
			"remoted_id",
			status.InstanceId,
			"local_id",
			s.instanceId,
			"status",
			status,
		)
		return false
	}

	log.Infow("Standby: instanceId is matching, exiting standby mode", "status", status)
	return true
}
