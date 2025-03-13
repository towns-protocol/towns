package app_registry

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt/v4"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/utils"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

type AppServiceRequestEnvelope struct {
	Command string          `json:"command"`
	Data    json.RawMessage `json:",omitempty"`
}
type TestAppServer struct {
	t                *testing.T
	httpServer       *http.Server
	listener         net.Listener
	url              string
	appWallet        *crypto.Wallet
	hs256SecretKey   []byte
	encryptionDevice app_client.EncryptionDevice
	client           protocolconnect.StreamServiceClient
}

// validateSignature verifies that the incoming request has a HS256-encoded jwt auth token stored
// in the header with the appropriate audience, signed by the expected secret key.
func validateSignature(req *http.Request, secretKey []byte, appId common.Address) error {
	authorization := req.Header.Get("Authorization")
	if authorization == "" {
		return fmt.Errorf("Unauthenticated")
	}

	const bearerPrefix = "Bearer "
	if !strings.HasPrefix(authorization, bearerPrefix) {
		return fmt.Errorf("invalid authorization header format")
	}

	tokenStr := strings.TrimPrefix(authorization, bearerPrefix)
	if tokenStr == "" {
		return fmt.Errorf("token missing from authorization header")
	}

	token, err := jwt.Parse(
		tokenStr,
		func(token *jwt.Token) (interface{}, error) {
			return secretKey, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}),
	)
	if err != nil {
		return fmt.Errorf("error parsing jwt token: %w", err)
	}

	if !token.Valid {
		return fmt.Errorf("invalid jwt token")
	}

	var mapClaims jwt.MapClaims
	var ok bool
	if mapClaims, ok = token.Claims.(jwt.MapClaims); !ok {
		return fmt.Errorf("jwt token is missing claims")
	}

	if !mapClaims.VerifyAudience(hex.EncodeToString(appId[:]), true) {
		return fmt.Errorf("invalid jwt token audience; should be app public address")
	}

	return mapClaims.Valid()
}

func NewTestAppServer(
	t *testing.T,
	appWallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
) *TestAppServer {
	listener, url := testcert.MakeTestListener(t)

	b := &TestAppServer{
		t:         t,
		listener:  listener,
		url:       url,
		appWallet: appWallet,
		client:    client,
	}

	return b
}

func (b *TestAppServer) Url() string {
	return b.url
}

func (b *TestAppServer) SetHS256SecretKey(secretKey []byte) {
	b.hs256SecretKey = secretKey
}

func (b *TestAppServer) SetEncryptionDevice(encryptionDevice app_client.EncryptionDevice) {
	b.encryptionDevice = encryptionDevice
}

func (b *TestAppServer) Close() {
	if b.httpServer != nil {
		b.httpServer.Close()
	}
	if b.listener != nil {
		b.listener.Close()
	}
}

func (b *TestAppServer) solicitKeys(ctx context.Context, data app_client.KeySolicitationData) error {
	log := logging.FromCtx(ctx).With("func", "TestAppServer.solicitKeys")
	log.Debugw("soliciting keys for channel", "channeL", data.ChannelId, "sessionId", data.SessionId)
	streamBytes, err := hex.DecodeString(data.ChannelId)
	if err != nil {
		log.Errorw("failed to decode channel id", "error", err, "channelId", data.ChannelId)
		return fmt.Errorf("failed to solicit keys: %w", err)
	}
	log.Debugw("streamBytes", "streamBytes", streamBytes, "encoded", hex.EncodeToString(streamBytes))
	resp, err := b.client.GetLastMiniblockHash(
		ctx,
		&connect.Request[protocol.GetLastMiniblockHashRequest]{
			Msg: &protocol.GetLastMiniblockHashRequest{
				StreamId: streamBytes,
			},
		},
	)
	if err != nil {
		log.Errorw("failed to get last miniblock for stream", "streamId", data.ChannelId)
		return fmt.Errorf("failed to get last miniblock hash for stream %v: %w", data.ChannelId, err)
	}

	envelope, err := events.MakeEnvelopeWithPayload(
		b.appWallet,
		&protocol.StreamEvent_MemberPayload{
			MemberPayload: &protocol.MemberPayload{
				Content: &protocol.MemberPayload_KeySolicitation_{
					KeySolicitation: &protocol.MemberPayload_KeySolicitation{
						DeviceKey:   b.encryptionDevice.DeviceKey,
						FallbackKey: b.encryptionDevice.FallbackKey,
						IsNewDevice: false,
						SessionIds: []string{
							data.SessionId,
						},
					},
				},
			},
		},
		&shared.MiniblockRef{
			Hash: common.BytesToHash(resp.Msg.Hash),
			Num:  resp.Msg.MiniblockNum,
		},
	)
	if err != nil {
		log.Errorw("failed to construct key soliciation stream event", "error", err)
		return fmt.Errorf("failed to construct key solicitation stream event: %w", err)
	}

	addEventResp, err := b.client.AddEvent(
		ctx,
		&connect.Request[protocol.AddEventRequest]{
			Msg: &protocol.AddEventRequest{
				StreamId: streamBytes,
				Event:    envelope,
			},
		},
	)
	if err != nil {
		log.Errorw("Failed to add key solicitation event to stream", "err", err)
		return fmt.Errorf("error adding key solicitation event to stream: %w", err)
	}
	if addErr := addEventResp.Msg.GetError(); addErr != nil {
		log.Errorw("Failed to add key solicitation event to stream", "err", addErr)
		return fmt.Errorf(
			"failed to add key solicitation event to stream: %v, %v, %v",
			addErr.Msg,
			addErr.Code,
			addErr.Funcs,
		)
	}
	return nil
}

func (b *TestAppServer) respondToSendMessages(
	ctx context.Context,
	data *app_client.SendSessionMessagesRequestData,
) error {
	log := zap.NewNop().Sugar()
	// log := logging.DefaultZapLogger(zapcore.DebugLevel).With("func", "TestAppServer.rootHandler")
	log.Debugw(
		"respondToSendMessages",
		"numEvents",
		len(data.StreamEvents),
		"sessionIds",
		data.SessionIds,
		"botDeviceKey",
		b.encryptionDevice.DeviceKey,
	)

	// streamBytes, err := proto.Marshal(event.Event)
	for _, streamBytes := range data.StreamEvents {
		var streamEvent protocol.StreamEvent
		if err := proto.Unmarshal(streamBytes, &streamEvent); err != nil {
			log.Errorw("Could not unmarshal stream event", "error", err)
			return fmt.Errorf("could not unmarshal stream event: %w", err)
		}
		payload, ok := streamEvent.Payload.(*protocol.StreamEvent_ChannelPayload)
		if !ok {
			log.Errorw("Could not cast channel stream payload")
			return fmt.Errorf("could not cast channel stream payload")
		}
		message, ok := payload.ChannelPayload.GetContent().(*protocol.ChannelPayload_Message)
		if !ok {
			log.Errorw("Could not extract message from channel payload")
			return fmt.Errorf("could not extract message from channel payload")
		}
		if message.Message.SenderKey == b.encryptionDevice.DeviceKey {
			log.Debugw("detected message from this sender, ignoring...")
			continue
		}

		streamIdBytes, err := shared.StreamIdFromString(data.StreamId)
		if err != nil {
			log.Errorw("Could not parse stream id", "error", err)
			return fmt.Errorf("could not parse stream id: %w", err)
		}

		log.Debugw(
			"respondToSendMessages message details",
			"m.m.SenderKey",
			message.Message.SenderKey,
			"m.m.SessionId",
			message.Message.SessionId,
			"m.m.Ciphertext",
			message.Message.Ciphertext,
		)

		resp, err := b.client.GetLastMiniblockHash(
			ctx,
			&connect.Request[protocol.GetLastMiniblockHashRequest]{
				Msg: &protocol.GetLastMiniblockHashRequest{
					StreamId: streamIdBytes[:],
				},
			},
		)
		if err != nil {
			log.Errorw("Could not get last miniblock hash of stream in order to post a response", "error", err)
			return fmt.Errorf("could not get last miniblock hash of stream in order to post a response: %w", err)
		}

		envelope, err := events.MakeEnvelopeWithPayload(
			b.appWallet,
			events.Make_ChannelPayload_Message_WithSession(
				fmt.Sprintf("%v %v reply", message.Message.SessionId, message.Message.Ciphertext),
				message.Message.SessionId,
			),
			&shared.MiniblockRef{
				Hash: common.Hash(resp.Msg.Hash),
				Num:  resp.Msg.MiniblockNum,
			},
		)
		if err != nil {
			log.Errorw("Could not construct envelope of message reply", "error", err)
			return fmt.Errorf("could not construct envelope of message reply: %w", err)
		}

		addResp, err := b.client.AddEvent(
			ctx,
			&connect.Request[protocol.AddEventRequest]{
				Msg: &protocol.AddEventRequest{
					StreamId: streamIdBytes[:],
					Event:    envelope,
				},
			},
		)
		if err != nil {
			log.Errorw("AddEvent failed for reply", "error", err)
			return fmt.Errorf("AddEvent failed for reply: %w", err)
		}
		if addResp.Msg.Error != nil {
			log.Errorw("AddEvent failed for reply", "error", addResp.Msg.Error.Msg)
			return fmt.Errorf("AddEvent failed for reply: %v", addResp.Msg.Error.Msg)
		}
	}
	return nil
}

func (b *TestAppServer) rootHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure that the request method is POST.
	// Uncomment to unconditionally enable logging
	// log := logging.DefaultZapLogger(zapcore.DebugLevel).With("func", "TestAppServer.rootHandler")
	log := logging.FromCtx(r.Context())
	if r.Method != http.MethodPost {
		log.Errorw("method not allowed", "method", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := validateSignature(r, b.hs256SecretKey, b.appWallet.Address); err != nil {
		log.Errorw("invalid signature", "secretKey", b.hs256SecretKey, "expectedWallet", b.appWallet)
		http.Error(w, "JWT Signature Invalid", http.StatusForbidden)
	}

	// Check that the Content-Type is application/json.
	if r.Header.Get("Content-Type") != "application/json" {
		log.Errorw("wrong content type", "ct", r.Header.Get("Content-Type"))
		http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
		return
	}

	// Decode the JSON request body into the Envelop struct.
	var payload AppServiceRequestEnvelope
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close() // Ensure the body is closed once we're done.

	if err := decoder.Decode(&payload); err != nil {
		log.Errorw("error decoding json", "err", err)
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	log.Debugw("received payload", "payload", payload, "command", payload.Command)

	// Send a response back.
	w.Header().Set("Content-Type", "application/json")
	var response any
	switch payload.Command {
	case "initialize":
		response = app_client.InitializeResponse{
			DefaultEncryptionDevice: app_client.EncryptionDevice{
				DeviceKey:   b.encryptionDevice.DeviceKey,
				FallbackKey: b.encryptionDevice.FallbackKey,
			},
		}
	case "solicit":
		var data app_client.KeySolicitationData
		if err := json.Unmarshal(payload.Data, &data); err != nil {
			log.Errorw(
				"Unable to unmarshal payload data into key solicitation data",
				"error",
				err,
				"payloadData",
				payload.Data,
			)
			http.Error(w, fmt.Sprintf("unable to solicit keys: %v", err), http.StatusBadRequest)
			return
		}
		if err := b.solicitKeys(logging.CtxWithLog(r.Context(), log), data); err != nil {
			log.Errorw("solicit keys request failed", "error", err, "data", data)
			http.Error(w, fmt.Sprintf("TestAppServer unable to solicit keys: %v", err), http.StatusBadRequest)
		}
		response = app_client.KeySolicitationResponse{}
	case "messages":
		var data app_client.SendSessionMessagesRequestData
		if err := json.Unmarshal(payload.Data, &data); err != nil {
			log.Errorw(
				"Unable to unmarshal payload data into send session messages request data",
				"error",
				err,
				"payloadData",
				payload.Data,
			)
			http.Error(w, fmt.Sprintf("unable to unmarshal message data: %v", err), http.StatusBadRequest)
			return
		}
		if err := b.respondToSendMessages(r.Context(), &data); err != nil {
			http.Error(w, fmt.Sprintf("unable to respond to sent messages: %v", err), http.StatusBadRequest)
			return
		}
		response = app_client.SendSessionMessagesResponse{}

	default:
		log.Errorw("unrecognized payload type", "command", payload.Command)
		http.Error(w, fmt.Sprintf("Unrecognized payload type: %v", payload.Command), http.StatusBadRequest)
		return
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Errorw("error encoding app service response", "error", err)
		b.t.Errorf("Error encoding app service response: %v", err)
	}
}

func (b *TestAppServer) Serve(ctx context.Context) error {
	mux := http.NewServeMux()

	// Register the handler for the root path
	mux.HandleFunc("/", b.rootHandler)

	b.httpServer = &http.Server{
		Handler: mux,
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
		// Uncomment for http server logs
		ErrorLog: utils.NewHttpLogger(ctx),
	}

	if err := b.httpServer.Serve(b.listener); err != http.ErrServerClosed {
		return err
	}
	return nil
}
