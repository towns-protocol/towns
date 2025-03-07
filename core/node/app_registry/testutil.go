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
	"go.uber.org/zap/zapcore"
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
	solicitations    chan shared.StreamId
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
		// Make this channel large enough not to block for most tests if
		// the caller chooses not to wait for solicitations
		solicitations: make(chan shared.StreamId, 256),
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
	log.Debugw("Soliciting keys for channel", "channeL", data.ChannelId, "sessionId", data.SessionId)
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
		log.Errorw("Failed to get last miniblock for stream", "streamId", data.ChannelId)
		return fmt.Errorf("failed to get last miniblock hash for stream %v: %w", data.ChannelId, err)
	}
	log.Debugw(
		"Last miniblock info",
		"hash",
		resp.Msg.Hash,
		"bytestoahsh",
		common.BytesToHash(resp.Msg.Hash),
		"num",
		resp.Msg.MiniblockNum,
	)

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
	log.Debugw("AddEvent succeeded...")
	if addErr := addEventResp.Msg.GetError(); addErr != nil {
		log.Errorw("Failed to add key solicitation event to stream", "err", addErr)
		return fmt.Errorf(
			"failed to add key solicitation event to stream: %v, %v, %v",
			addErr.Msg,
			addErr.Code,
			addErr.Funcs,
		)
	}
	log.Infow("Returning with success")
	return nil
}

func (b *TestAppServer) rootHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure that the request method is POST.
	log := logging.DefaultZapLogger(zapcore.DebugLevel)
	log.Info("TestAppServer rootHandler called!")
	if r.Method != http.MethodPost {
		log.Errorw("TestAppServer method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := validateSignature(r, b.hs256SecretKey, b.appWallet.Address); err != nil {
		log.Errorw("TestAppServer invalid signature", "secretKey", b.hs256SecretKey, "expectedWallet", b.appWallet)
		http.Error(w, "JWT Signature Invalid", http.StatusForbidden)
	}

	// Check that the Content-Type is application/json.
	if r.Header.Get("Content-Type") != "application/json" {
		log.Errorw("TestAppServer wrong content type", "ct", r.Header.Get("Content-Type"))
		http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
		return
	}

	// Decode the JSON request body into the Envelop struct.
	var payload AppServiceRequestEnvelope
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close() // Ensure the body is closed once we're done.

	if err := decoder.Decode(&payload); err != nil {
		log.Errorw("TestAppServer error decoding json", "err", err)
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// For demonstration, print the received payload.
	// log := logging.DefaultZapLogger(zapcore.DebugLevel)
	log.Infow("Received payload", "payload", payload, "command", payload.Command)

	// Send a response back.
	w.Header().Set("Content-Type", "application/json")
	var response any
	switch payload.Command {
	case "initialize":
		log.Debugw("TestAppServer initialize request detected")
		response = app_client.InitializeResponse{
			DefaultEncryptionDevice: app_client.EncryptionDevice{
				DeviceKey:   b.encryptionDevice.DeviceKey,
				FallbackKey: b.encryptionDevice.FallbackKey,
			},
		}
	case "solicit":
		log.Debugw("TestAppServer solicitation request detected")
		var data app_client.KeySolicitationData
		if err := json.Unmarshal(payload.Data, &data); err != nil {
			log.Errorw(
				"Unable to unmarshal payload data into key solicitation data",
				"error",
				err,
				"payloadData",
				payload.Data,
			)
			http.Error(w, fmt.Sprintf("TestAppServer unable to solicit keys: %v", err), http.StatusBadRequest)
			return
		}
		log.Debugw("TestAppServer proceeding with solicitatino request...", "data", data)
		if err := b.solicitKeys(logging.CtxWithLog(r.Context(), log), data); err != nil {
			log.Errorw("TestAppServer solicit request failed", "error", err, "data", data)
			http.Error(w, fmt.Sprintf("TestAppServer unable to solicit keys: %v", err), http.StatusBadRequest)
		}
		response = app_client.KeySolicitationResponse{}
	default:
		log.Errorw("TestAppServer Unrecognized payload type", "command", payload.Command)
		http.Error(w, fmt.Sprintf("Unrecognized payload type: %v", payload.Command), http.StatusBadRequest)
		log.Sync()
		return
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
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
