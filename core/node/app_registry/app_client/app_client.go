package app_client

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/ethereum/go-ethereum/common"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type EncryptionDevice struct {
	DeviceKey   string `json:"deviceKey"`
	FallbackKey string `json:"fallbackKey"`
}

type InitializeResponse struct {
	DefaultEncryptionDevice EncryptionDevice `json:"defaultEncryptionDevice"`
}

type InitializeData struct{}

type KeySolicitationResponse struct{}

type KeySolicitationData struct {
	SessionId string `json:"sessionId"`
	ChannelId string `json:"channelId"`
}

type AppServiceRequestPayload struct {
	Command string `json:"command"`
	Data    any    `json:",omitempty"`
}

type AppClient struct {
	httpClient *http.Client
}

func NewAppClient(httpClient *http.Client, allowLoopback bool) *AppClient {
	if !allowLoopback {
		httpClient = NewExternalHttpsClient(httpClient)
	}
	return &AppClient{
		httpClient: httpClient,
	}
}

// InitializeWebhook calls "initialize" on an app service specified by the webhook url
// with a jwt token included in the request header that was generated from the shared
// secret returned to the app upon registration. The caller should verify that we can
// see a device_id and fallback key in the user stream that matches the device id and
// fallback key returned in the status message.
func (b *AppClient) InitializeWebhook(
	ctx context.Context,
	webhookUrl string,
	appId common.Address,
	hs256SharedSecret [32]byte,
) (*EncryptionDevice, error) {
	payload := AppServiceRequestPayload{
		Command: "initialize",
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing request payload to initialize webhook").
			Tag("appId", appId)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", webhookUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing request to initialize webhook").
			Tag("appId", appId)
	}

	// Add authorization header based on the shared secret for this app.
	if err := signRequest(req, hs256SharedSecret[:], appId); err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error signing request to initialize webhook").
			Tag("appId", appId)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Unable to initialize the webhook").
			Tag("appId", appId)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, base.RiverError(protocol.Err_CANNOT_CALL_WEBHOOK, "webhook response non-OK status").
			Tag("appId", appId)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Webhook response was unreadable").
			Tag("appId", appId)
	}

	var initializeResp InitializeResponse
	if err = json.Unmarshal(body, &initializeResp); err != nil {
		return nil, base.WrapRiverError(protocol.Err_MALFORMED_WEBHOOK_RESPONSE, err).
			Message("Webhook response was unparsable").
			Tag("appId", appId)
	}

	return &initializeResp.DefaultEncryptionDevice, nil
}

func (b *AppClient) RequestSolicitation(
	ctx context.Context,
	appId common.Address,
	webhookUrl string,
	hs256SharedSecret [32]byte,
	channelId shared.StreamId,
	sessionId string,
) error {
	payload := AppServiceRequestPayload{
		Command: "solicit",
		Data: KeySolicitationData{
			SessionId: sessionId,
			ChannelId: channelId.String(),
		},
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing request payload").
			Tag("appId", appId).
			Tag("channelId", channelId).
			Tag("sessionId", sessionId)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", webhookUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		return base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing http request").
			Tag("appId", appId)
	}

	// Add authorization header based on the shared secret for this app.
	if err := signRequest(req, hs256SharedSecret[:], appId); err != nil {
		return base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error signing request").
			Tag("appId", appId)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Unable to request a key solicitation").
			Tag("appId", appId).
			Tag("channelId", channelId).
			Tag("sessionId", sessionId)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return base.RiverError(protocol.Err_CANNOT_CALL_WEBHOOK, "webhook response non-OK status").
			Tag("appId", appId).
			Tag("channelId", channelId).
			Tag("sessionId", sessionId)
	}
	return nil
}

// GetWebhookStatus sends an "info" message to the app service and expects a 200 with
// version info returned.
// TODO - implement.
func (b *AppClient) GetWebhookStatus(
	ctx context.Context,
	webhookUrl string,
	appId common.Address,
	hs256SharedSecret [32]byte,
) error {
	return base.RiverError(protocol.Err_UNIMPLEMENTED, "GetWebhookStatus unimplemented")
}

func (b *AppClient) SendSessionMessages(
	ctx context.Context,
	appId common.Address,
	deviceKey string,
	hs256SharedSecret [32]byte,
	cipherText string,
	webhookUrl string,
	streamEvents [][]byte,
) error {
	return base.RiverError(protocol.Err_UNIMPLEMENTED, "SendSessionMessages unimplemented")
}
