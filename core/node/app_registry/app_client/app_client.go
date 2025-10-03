package app_client

import (
	"bytes"
	"context"
	"io"
	"net/http"

	"github.com/ethereum/go-ethereum/common"

	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type EncryptionDevice struct {
	DeviceKey   string
	FallbackKey string
}

type WebhookStatus struct {
	FrameworkVersion int
	DeviceKey        string
	FallbackKey      string
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

func (b *AppClient) marshalAndPostProto(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	payload *protocol.AppServiceRequest,
	webhookUrl string,
) (*http.Response, error) {
	marshalledProto, err := proto.Marshal(payload)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error marshalling payload").
			Tag("appId", appId)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", webhookUrl, bytes.NewReader(marshalledProto))
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error constructing http request").
			Tag("appId", appId)
	}

	// Add authorization header based on the shared secret for this app.
	if err := signRequest(req, hs256SharedSecret[:], appId); err != nil {
		return nil, base.WrapRiverError(protocol.Err_INTERNAL, err).
			Message("Error signing request").
			Tag("appId", appId)
	}

	// Set headers to indicate that the request body is in protobuf format.
	req.Header.Set("Content-Type", "application/x-protobuf")
	// Set the Accept header to indicate the expected response format.
	req.Header.Set("Accept", "application/x-protobuf")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Unable to send request to webhook").
			Tag("appId", appId)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, base.RiverError(protocol.Err_CANNOT_CALL_WEBHOOK, "webhook response non-OK status").
			Tag("appId", appId)
	}

	// Sanity check
	if resp == nil {
		return nil, base.RiverError(protocol.Err_INTERNAL, "unexpected error: http library returned an empty error and response").
			Tag("appId", appId)
	}

	return resp, nil
}

func sendRequestAndParseResponse(
	client *AppClient,
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	webhookUrl string,
	request *protocol.AppServiceRequest,
) (*protocol.AppServiceResponse, error) {
	log := logging.FromCtx(ctx)
	resp, err := client.marshalAndPostProto(
		ctx,
		appId,
		hs256SharedSecret,
		request,
		webhookUrl,
	)
	if err != nil {
		log.Errorw("marshalAndPostProto err", "error", err)
		return nil, base.AsRiverError(err).
			Message("Unable to send app request")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_CANNOT_CALL_WEBHOOK, err).
			Message("Webhook response was unreadable").
			Tag("appId", appId)
	}

	var response protocol.AppServiceResponse
	if err = proto.Unmarshal(body, &response); err != nil {
		return nil, base.WrapRiverError(protocol.Err_MALFORMED_WEBHOOK_RESPONSE, err).
			Message("Webhook response could not be marshalled").
			Tag("appId", appId)
	}

	return &response, nil
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
	resp, err := sendRequestAndParseResponse(
		b,
		ctx,
		appId,
		hs256SharedSecret,
		webhookUrl,
		&protocol.AppServiceRequest{
			Payload: &protocol.AppServiceRequest_Initialize{},
		},
	)
	if err != nil {
		return nil, err
	}
	if resp.GetInitialize() == nil || resp.GetInitialize().GetEncryptionDevice() == nil {
		return nil, base.RiverError(
			protocol.Err_MALFORMED_WEBHOOK_RESPONSE,
			"Response is missing encryption device",
		).Func("AppClient.InitializeWebhook")
	}

	return &EncryptionDevice{
		DeviceKey:   resp.GetInitialize().EncryptionDevice.DeviceKey,
		FallbackKey: resp.GetInitialize().EncryptionDevice.FallbackKey,
	}, nil
}

func (b *AppClient) RequestSolicitation(
	ctx context.Context,
	appId common.Address,
	hs256SharedSecret [32]byte,
	webhookUrl string,
	channelId shared.StreamId,
	sessionId string,
) error {
	request := &protocol.AppServiceRequest{
		Payload: &protocol.AppServiceRequest_Events{
			Events: &protocol.EventsPayload{
				Events: []*protocol.EventPayload{
					{
						Payload: &protocol.EventPayload_Solicitation{
							Solicitation: &protocol.EventPayload_SolicitKeys{
								SessionIds: []string{sessionId},
								StreamId:   channelId[:],
							},
						},
					},
				},
			},
		},
	}

	_, err := sendRequestAndParseResponse(
		b,
		ctx,
		appId,
		hs256SharedSecret,
		webhookUrl,
		request,
	)

	return err
}

func (b *AppClient) SendSessionMessages(
	ctx context.Context,
	streamId shared.StreamId,
	appId common.Address,
	hs256SharedSecret [32]byte,
	messageEnvelopes [][]byte,
	encryptionEnvelopes [][]byte,
	webhookUrl string,
) error {
	messages := &protocol.EventPayload_Messages{
		StreamId: streamId[:],
	}
	for _, envelopeBytes := range messageEnvelopes {
		var envelope protocol.Envelope
		if err := proto.Unmarshal(envelopeBytes, &envelope); err != nil {
			return base.RiverError(protocol.Err_BAD_EVENT, "Could not parse bytes as Envelope").
				Tag("appId", appId)
		}
		messages.Messages = append(messages.Messages, &envelope)
	}

	for _, envelopeBytes := range encryptionEnvelopes {
		var envelope protocol.Envelope
		if err := proto.Unmarshal(envelopeBytes, &envelope); err != nil {
			return base.RiverError(protocol.Err_BAD_EVENT, "Could not parse bytes as Envelope").
				Tag("appId", appId)
		}
		messages.GroupEncryptionSessionsMessages = append(messages.GroupEncryptionSessionsMessages, &envelope)
	}

	_, err := sendRequestAndParseResponse(
		b,
		ctx,
		appId,
		hs256SharedSecret,
		webhookUrl,
		&protocol.AppServiceRequest{
			Payload: &protocol.AppServiceRequest_Events{
				Events: &protocol.EventsPayload{
					Events: []*protocol.EventPayload{
						{
							Payload: &protocol.EventPayload_Messages_{
								Messages: messages,
							},
						},
					},
				},
			},
		},
	)
	return err
}

// GetWebhookStatus sends a "status" message to the app service and expects a 200 with
// version info returned.
func (b *AppClient) GetWebhookStatus(
	ctx context.Context,
	webhookUrl string,
	appId common.Address,
	hs256SharedSecret [32]byte,
) (status *protocol.AppServiceResponse_StatusResponse, err error) {
	// Apply function-wide tags to the returned error
	defer func() {
		if err != nil {
			err = base.AsRiverError(err, protocol.Err_INTERNAL).
				Func("AppClient.GetWebhookStatus").
				Tag("appId", appId)
		}
	}()

	resp, err := sendRequestAndParseResponse(
		b,
		ctx,
		appId,
		hs256SharedSecret,
		webhookUrl,
		&protocol.AppServiceRequest{
			Payload: &protocol.AppServiceRequest_Status{},
		},
	)
	if err != nil {
		return nil, err
	}

	status = resp.GetStatus()
	if status == nil {
		return nil, base.RiverError(
			protocol.Err_MALFORMED_WEBHOOK_RESPONSE,
			"Webhook response is missing status",
		)
	}

	if status.GetFrameworkVersion() == 0 {
		return nil, base.RiverError(
			protocol.Err_MALFORMED_WEBHOOK_RESPONSE,
			"Webhook status response is missing framework version",
		)
	}

	if status.GetDeviceKey() == "" {
		return nil, base.RiverError(
			protocol.Err_MALFORMED_WEBHOOK_RESPONSE,
			"Webhook status response is missing device key",
		)
	}

	if status.GetFallbackKey() == "" {
		return nil, base.RiverError(
			protocol.Err_MALFORMED_WEBHOOK_RESPONSE,
			"Webhook status response is missing fallback key",
		)
	}

	return status, nil
}
