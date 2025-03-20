package app_registry

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt/v4"
	"go.uber.org/zap/zapcore"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/utils"
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

func parseEncryptionEnvelope(envelope *protocol.Envelope) (*protocol.UserInboxPayload_GroupEncryptionSessions, error) {
	event, err := events.ParseEvent(envelope)
	if err != nil {
		return nil, fmt.Errorf("error parsing encryption envelope: %w", err)
	}

	payload := event.Event.GetUserInboxPayload()
	if payload == nil {
		return nil, fmt.Errorf("forwarded encryption event was not a user inbox event")
	}

	encryptionSessions := payload.GetGroupEncryptionSessions()
	if encryptionSessions == nil {
		return nil, fmt.Errorf("forwarded encryption event did not have a group encryption sessions payload")
	}

	return encryptionSessions, nil
}

func (b *TestAppServer) respondToSendMessages(
	ctx context.Context,
	data *protocol.AppServiceRequest,
) error {
	log := logging.FromCtx(ctx)
	// Swap with above to enable debug logs
	// log := logging.DefaultZapLogger(zapcore.DebugLevel)
	log.Debugw(
		"respondToSendMessages",
		"numMessages",
		len(data.Messages),
		"numEncryptionMessages",
		len(data.GroupEncryptionSessionsMessages),
		"botDeviceKey",
		b.encryptionDevice.DeviceKey,
	)

	sessionIdToEncryptionMaterial := make(map[string]*protocol.UserInboxPayload_GroupEncryptionSessions)
	for i, envelopeBytes := range data.GroupEncryptionSessionsMessages {
		sessions, err := parseEncryptionEnvelope(envelopeBytes)
		if err != nil {
			return fmt.Errorf("error parsing encryption envelope %d: %w", i, err)
		}
		for _, sessionId := range sessions.GetSessionIds() {
			sessionIdToEncryptionMaterial[sessionId] = sessions
		}
	}

	for _, envelope := range data.Messages {
		parsedEvent, err := events.ParseEvent(envelope)
		if err != nil {
			log.Errorw("ould not parse message envelope", "err", err)
			return fmt.Errorf("could not parse message envelope: %w", err)
		}
		streamEvent := parsedEvent.Event
		log.Infow("streamEvent", "streamEvent", parsedEvent.Event)
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

		sessions, ok := sessionIdToEncryptionMaterial[message.Message.SessionId]
		if !ok {
			log.Errorw(
				"Did not find sessionId in group encryption sessions for sent messages",
				"sessionId",
				message.Message.SessionId,
			)
			return fmt.Errorf(
				"did not find sessionId %v in group encryption sessions for sent messages",
				message.Message.SessionId,
			)
		}

		streamIdBytes, err := shared.StreamIdFromBytes(sessions.StreamId)
		if err != nil {
			log.Errorw("Could not parse stream id", "error", err, "raw", sessions.StreamId)
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
				fmt.Sprintf(
					"%v %v reply (%v)",
					message.Message.SessionId,
					message.Message.Ciphertext,
					sessions.Ciphertexts[b.encryptionDevice.DeviceKey],
				),
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
	log := logging.DefaultZapLogger(zapcore.DebugLevel)
	// log := logging.FromCtx(r.Context())
	ctx := logging.CtxWithLog(r.Context(), log)
	if r.Method != http.MethodPost {
		log.Errorw("method not allowed", "method", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := validateSignature(r, b.hs256SecretKey, b.appWallet.Address); err != nil {
		log.Errorw("invalid signature", "secretKey", b.hs256SecretKey, "expectedWallet", b.appWallet)
		http.Error(w, "JWT Signature Invalid", http.StatusForbidden)
	}

	if r.Header.Get("Content-Type") == "application/x-protobuf" {
		log.Infow("Received request")
		var request protocol.AppServiceRequest
		data, err := io.ReadAll(r.Body)
		if err != nil {
			log.Errorw("could not read request body", "error", err)
			http.Error(w, "could not read request body", http.StatusInternalServerError)
			return
		}
		if err := proto.Unmarshal(data, &request); err != nil {
			log.Errorw("could not marshal protobuf request", "error", err)
			http.Error(w, "could not marshal protobuf request", http.StatusBadRequest)
			return
		}
		var response protocol.AppServiceResponse
		if request.Action != nil {
			switch request.Action.(type) {
			case *protocol.AppServiceRequest_Initialize:
				log.Infow("initialize...")
				response.EncryptionDevice = &protocol.UserMetadataPayload_EncryptionDevice{
					DeviceKey:   b.encryptionDevice.DeviceKey,
					FallbackKey: b.encryptionDevice.FallbackKey,
				}

			default:
				log.Errorw("unrecognized action type", "action", request.Action)
				http.Error(w, "unrecognized payload type", http.StatusBadRequest)
				return
			}
		}

		log.Infow("send_messages...", "numMessages", len(request.GetMessages()))
		if err := b.respondToSendMessages(ctx, &request); err != nil {
			http.Error(w, fmt.Sprintf("unable to respond to sent messages: %v", err), http.StatusBadRequest)
			return
		}

		// Marshal the response message to binary format.
		respData, err := proto.Marshal(&response)
		if err != nil {
			log.Errorw("failed to marshal response message", "err", err)
			http.Error(w, "Failed to marshal response message", http.StatusInternalServerError)
			return
		}

		// Set the appropriate response header.
		w.Header().Set("Content-Type", "application/x-protobuf")
		// Write the protobuf data to the response.
		if _, err = w.Write(respData); err != nil {
			log.Errorw("Error writing response", "error", err)
		}
		log.Info("done with protobuf response")
		return
	} else if r.Header.Get("Content-Type") != "application/json" {
		log.Errorw("wrong content type", "ct", r.Header.Get("Content-Type"))
		http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
		return
	}

	// Decode the JSON request body into the Envelope struct.
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
