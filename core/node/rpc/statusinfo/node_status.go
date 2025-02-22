package statusinfo

import (
	"encoding/json"

	"github.com/towns-protocol/towns/core/node/storage"
)

type BlockchainPing struct {
	Result  string `json:"result"`
	ChainId uint64 `json:"chain_id"`
	Block   uint64 `json:"block,omitempty"`
	Latency string `json:"latency"`
}

type StatusResponse struct {
	Status            string           `json:"status"`
	InstanceId        string           `json:"instance_id"`
	Address           string           `json:"address"`
	Version           string           `json:"version"`
	StartTime         string           `json:"start_time"`
	Uptime            string           `json:"uptime"`
	Graffiti          string           `json:"graffiti,omitempty"`
	River             *BlockchainPing  `json:"river,omitempty"`
	Base              *BlockchainPing  `json:"base,omitempty"`
	OtherChains       []BlockchainPing `json:"other_chains,omitempty"`
	XChainBlockchains []uint64         `json:"x_chain_blockchains"`
}

func StatusResponseFromJson(data []byte) (StatusResponse, error) {
	var result StatusResponse
	err := json.Unmarshal(data, &result)
	return result, err
}

func (r StatusResponse) ToPrettyJson() string {
	return toPrettyJson(r)
}

type RegistryNodeInfo struct {
	Address    string `json:"address"`
	Url        string `json:"url"`
	Operator   string `json:"operator"`
	Status     int    `json:"status"`
	StatusText string `json:"status_text"`
}

type HttpResult struct {
	Success       bool           `json:"success"`
	Status        int            `json:"status"`
	StatusText    string         `json:"status_text"`
	Elapsed       string         `json:"elapsed"`
	Timeline      Timeline       `json:"timeline"`
	Response      StatusResponse `json:"response"`
	Protocol      string         `json:"protocol"`
	UsedTLS       bool           `json:"used_tls"`
	RemoteAddress string         `json:"remote_address"`
	DNSAddresses  []string       `json:"dns_addresses"`
}

func (r HttpResult) ToPrettyJson() string {
	return toPrettyJson(r)
}

type GrpcResult struct {
	Success       bool     `json:"success"`
	StatusText    string   `json:"status_text"`
	Elapsed       string   `json:"elapsed"`
	Timeline      Timeline `json:"timeline"`
	Version       string   `json:"version"`
	StartTime     string   `json:"start_time"`
	Uptime        string   `json:"uptime"`
	Graffiti      string   `json:"graffiti,omitempty"`
	Protocol      string   `json:"protocol"`
	XHttpVersion  string   `json:"x_http_version"`
	RemoteAddress string   `json:"remote_address"`
	DNSAddresses  []string `json:"dns_addresses"`
}

type Timeline struct {
	DNSDone              string `json:"dns_done"`
	ConnectDone          string `json:"connect_done"`
	TLSHandshakeDone     string `json:"tls_handshake_done"`
	WroteRequest         string `json:"wrote_request"`
	GotFirstResponseByte string `json:"got_first_response_byte"`
	Total                string `json:"total"`
}

func (r GrpcResult) ToPrettyJson() string {
	return toPrettyJson(r)
}

type NodeStatus struct {
	Record          RegistryNodeInfo              `json:"record"`
	Local           bool                          `json:"local,omitempty"`
	Http11          HttpResult                    `json:"http11"`
	Http20          HttpResult                    `json:"http20"`
	Grpc            GrpcResult                    `json:"grpc"`
	RiverEthBalance string                        `json:"river_eth_balance"`
	BaseEthBalance  string                        `json:"base_eth_balance"`
	PostgresStatus  *storage.PostgresStatusResult `json:"postgres_status,omitempty"`
}

type RiverStatus struct {
	Nodes     []*NodeStatus `json:"nodes"`
	QueryTime string        `json:"query_time"`
	Elapsed   string        `json:"elapsed"`
}

func (r RiverStatus) ToPrettyJson() string {
	return toPrettyJson(r)
}

func toPrettyJson(v any) string {
	b, err := json.MarshalIndent(v, "", "  ")
	if err == nil {
		return string(b)
	} else {
		return "\"FAILED\""
	}
}
