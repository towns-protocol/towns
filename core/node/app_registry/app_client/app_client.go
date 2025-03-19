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

// command: "initialize"
type InitializeData struct{}

type InitializeResponse struct {
	DefaultEncryptionDevice EncryptionDevice `json:"defaultEncryptionDevice"`
}

// command: "solicit"
type KeySolicitationData struct {
	SessionId string `json:"sessionId"`
	ChannelId string `json:"channelId"`
}

type KeySolicitationResponse struct{}

// command: "messages"
type SendSessionMessagesRequestData struct {
	SessionIds   []string `json:"sessionId"`
	CipherTexts  string   `json:"cipherTexts"`
	StreamEvents [][]byte `json:"streamEvents"`
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

func (b *AppClient) marshalAndPost(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	payload *AppServiceRequestPayload,
	webhookUrl string,
) (*http.Response, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing messages payload").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", webhookUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing http request").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	// Add authorization header based on the shared secret for this app.
	if err := signRequest(req, hs256SharedSecret[:], appId); err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error signing request").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Unable to send request to webhook").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, base.RiverError(protocol.Err_CANNOT_CALL_WEBHOOK, "webhook response non-OK status").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	// Sanity check
	if resp == nil {
		return nil, base.RiverError(protocol.Err_INTERNAL, "unexpected error: http library returned an empty error and response").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	return resp, nil
}

// InitializeWebhook calls "initialize" on an app service specified by the webhook url
// with a jwt token included in the request header that was generated from the shared
// secret returned to the app upon registration. The caller should verify that we can
// see a device_id and fallback key in the user stream that matches the device id and
// fallback key returned in the status message.
func (b *AppClient) InitializeWebhook(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	webhookUrl string,
) (*EncryptionDevice, error) {
	resp, err := b.marshalAndPost(
		ctx,
		appId,
		hs256SharedSecret,
		&AppServiceRequestPayload{
			Command: "initialize",
		},
		webhookUrl,
	)
	if err != nil {
		return nil, base.AsRiverError(err).
			Message("Unable to initialize the webhook")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Webhook response was unreadable").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	var initializeResp InitializeResponse
	if err = json.Unmarshal(body, &initializeResp); err != nil {
		return nil, base.WrapRiverError(protocol.Err_MALFORMED_WEBHOOK_RESPONSE, err).
			Message("Webhook response was unparsable").
			Tag("appId", appId).
			Tag("webhookUrl", webhookUrl)
	}

	return &initializeResp.DefaultEncryptionDevice, nil
}

func (b *AppClient) RequestSolicitation(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	webhookUrl string,
	channelId shared.StreamId,
	sessionId string,
) error {
	resp, err := b.marshalAndPost(
		ctx,
		appId,
		hs256SharedSecret,
		&AppServiceRequestPayload{
			Command: "solicit",
			Data: KeySolicitationData{
				SessionId: sessionId,
				ChannelId: channelId.String(),
			},
		},
		webhookUrl,
	)
	if err != nil {
		return base.AsRiverError(err).
			Message("Unable to request a key solicitation").
			Tag("channelId", channelId).
			Tag("sessionId", sessionId)
	}
	defer resp.Body.Close()

	return nil
}

func (b *AppClient) SendSessionMessages(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	sessionIds []string,
	cipherTexts string,
	webhookUrl string,
	streamEvents [][]byte,
) error {
	resp, err := b.marshalAndPost(
		ctx,
		appId,
		hs256SharedSecret,
		&AppServiceRequestPayload{
			Command: "messages",
			Data: SendSessionMessagesRequestData{
				SessionIds:   sessionIds,
				CipherTexts:  cipherTexts,
				StreamEvents: streamEvents,
			},
		},
		webhookUrl,
	)
	if err != nil {
		return base.AsRiverError(err).Func("SendSessionMessages")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return base.RiverError(protocol.Err_CANNOT_CALL_WEBHOOK, "webhook response non-OK status").
			Tag("appId", appId).
			Tag("sessionIds", sessionIds)
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
