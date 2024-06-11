package statusinfo

import "encoding/json"

type BlockchainPing struct {
	Result  string `json:"result"`
	ChainId uint64 `json:"chain_id"`
	Block   uint64 `json:"block,omitempty"`
	Latency string `json:"latency"`
}

type StatusResponse struct {
	Status     string          `json:"status"`
	InstanceId string          `json:"instance_id"`
	Address    string          `json:"address"`
	Version    string          `json:"version"`
	StartTime  string          `json:"start_time"`
	Uptime     string          `json:"uptime"`
	Graffiti   string          `json:"graffiti,omitempty"`
	River      *BlockchainPing `json:"river,omitempty"`
	Base       *BlockchainPing `json:"base,omitempty"`
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
	Success          bool           `json:"success"`
	Status           int            `json:"status"`
	StatusText       string         `json:"status_text"`
	Elapsed          string         `json:"elapsed"`
	ElapsedAfterDNS  string         `json:"elapsed_after_dns"`
	ElapsedAfterConn string         `json:"elapsed_after_conn"`
	Response         StatusResponse `json:"response"`
	Protocol         string         `json:"protocol"`
	UsedTLS          bool           `json:"used_tls"`
	RemoteAddress    string         `json:"remote_address"`
	DNSAddresses     []string       `json:"dns_addresses"`
}

func (r HttpResult) ToPrettyJson() string {
	return toPrettyJson(r)
}

type GrpcResult struct {
	Success          bool     `json:"success"`
	StatusText       string   `json:"status_text"`
	Elapsed          string   `json:"elapsed"`
	ElapsedAfterDNS  string   `json:"elapsed_after_dns"`
	ElapsedAfterConn string   `json:"elapsed_after_conn"`
	Version          string   `json:"version"`
	StartTime        string   `json:"start_time"`
	Uptime           string   `json:"uptime"`
	Graffiti         string   `json:"graffiti,omitempty"`
	Protocol         string   `json:"protocol"`
	XHttpVersion     string   `json:"x_http_version"`
	RemoteAddress    string   `json:"remote_address"`
	DNSAddresses     []string `json:"dns_addresses"`
}

func (r GrpcResult) ToPrettyJson() string {
	return toPrettyJson(r)
}

type NodeStatus struct {
	Record          RegistryNodeInfo `json:"record"`
	Local           bool             `json:"local,omitempty"`
	Http11          HttpResult       `json:"http11"`
	Http20          HttpResult       `json:"http20"`
	Grpc            GrpcResult       `json:"grpc"`
	RiverEthBalance string           `json:"river_eth_balance"`
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
