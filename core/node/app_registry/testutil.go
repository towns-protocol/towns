package app_registry

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"
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

type botServerConfig struct {
	appWallet        *crypto.Wallet
	hs256SecretKey   []byte
	encryptionDevice app_client.EncryptionDevice
	frameworkVersion int32
}

type TestAppServer struct {
	t             *testing.T
	httpServer    *http.Server
	listener      net.Listener
	url           string
	botConfig     []*botServerConfig
	client        protocolconnect.StreamServiceClient
	enableLogging bool
	exitSignal    chan (error)
}

func FormatTestAppMessageReply(session string, messageText string, sessionKeys string) string {
	return fmt.Sprintf("ChannelMessage session(%v) cipherText(%v) sessionKeys(%v)", session, messageText, sessionKeys)
}

func FormatKeySolicitationReply(solicitation *protocol.MemberPayload_KeySolicitation) string {
	return fmt.Sprintf(
		"KeySolicitation deviceKey(%v) fallbackKey(%v) sessionIds(%v)",
		solicitation.DeviceKey,
		solicitation.FallbackKey,
		solicitation.SessionIds,
	)
}

func FormatMembershipReply(membership *protocol.MemberPayload_Membership) string {
	userAddress := common.BytesToAddress(membership.UserAddress)
	initiatorAddress := common.BytesToAddress(membership.InitiatorAddress)
	streamParent := shared.StreamId(membership.GetStreamParentId())
	return fmt.Sprintf(
		"Membership op(%v) user(%v) initiator(%v) streamParent(%v)",
		membership.Op,
		userAddress,
		initiatorAddress,
		streamParent,
	)
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

type TestAppServerOpts struct {
	// If 0, default to 1
	NumBots int

	// If any AppWallets are specified, use these instead of creating a new wallet
	// for the bot at that index.
	AppWallets []*crypto.Wallet
}

func NewTestAppServer(
	t *testing.T,
	ctx context.Context,
	opts TestAppServerOpts,
	client protocolconnect.StreamServiceClient,
	enableLogging bool,
) *TestAppServer {
	listener, url := testcert.MakeTestListener(t)

	numBots := opts.NumBots
	if numBots < 1 {
		numBots = 1
	}

	botConfig := make([]*botServerConfig, numBots)
	for i := range botConfig {
		if i < len(opts.AppWallets) {
			botConfig[i] = &botServerConfig{
				appWallet: opts.AppWallets[i],
			}
		} else {
			wallet, err := crypto.NewWallet(ctx)
			require.NoError(t, err, "Error creating wallet in TestAppServer")
			botConfig[i] = &botServerConfig{
				appWallet: wallet,
			}
		}
	}

	b := &TestAppServer{
		t:             t,
		listener:      listener,
		url:           url,
		botConfig:     botConfig,
		client:        client,
		enableLogging: enableLogging,
		exitSignal:    make(chan (error), 16),
	}

	return b
}

func (b *TestAppServer) ExitSignal() <-chan (error) {
	return b.exitSignal
}

func (b *TestAppServer) Url(botIndex int) string {
	baseUrl, err := url.Parse(b.url)
	require.NoError(b.t, err, "Error parsing TestAppServerUrl (%v)", b.url)
	return baseUrl.JoinPath(fmt.Sprintf("%d", botIndex)).String()
}

func (b *TestAppServer) SetHS256SecretKey(botIndex int, secretKey []byte) {
	b.botConfig[botIndex].hs256SecretKey = secretKey
}

func (b *TestAppServer) SetEncryptionDevice(botIndex int, encryptionDevice app_client.EncryptionDevice) {
	b.botConfig[botIndex].encryptionDevice = encryptionDevice
}

func (b *TestAppServer) SetFrameworkVersion(botIndex int, version int32) {
	if botIndex < 0 {
		for i := range b.botConfig {
			b.SetFrameworkVersion(i, version)
		}
	} else {
		b.botConfig[botIndex].frameworkVersion = version
	}
}

func (b *TestAppServer) Close() {
	if b.httpServer != nil {
		b.httpServer.Close()
	}
	if b.listener != nil {
		b.listener.Close()
	}
}

func (b *TestAppServer) solicitKeys(ctx context.Context, botIndex int, data *protocol.EventPayload_SolicitKeys) error {
	botConfig := b.botConfig[botIndex]
	log := logging.FromCtx(ctx).With("func", "TestAppServer.solicitKeys")

	streamId, err := shared.StreamIdFromBytes(data.StreamId)
	if err != nil {
		return logAndReturnErr(log, fmt.Errorf("failed to parse stream for key solicitation: %w", err))
	}

	log.Debugw("soliciting keys for channel", "streamId", streamId, "sessionIds", data.SessionIds)
	resp, err := b.client.GetLastMiniblockHash(
		ctx,
		&connect.Request[protocol.GetLastMiniblockHashRequest]{
			Msg: &protocol.GetLastMiniblockHashRequest{
				StreamId: data.StreamId,
			},
		},
	)
	if err != nil {
		return logAndReturnErr(log, fmt.Errorf("failed to get last miniblock hash for stream %v: %w", streamId, err))
	}

	envelope, err := events.MakeEnvelopeWithPayload(
		botConfig.appWallet,
		&protocol.StreamEvent_MemberPayload{
			MemberPayload: &protocol.MemberPayload{
				Content: &protocol.MemberPayload_KeySolicitation_{
					KeySolicitation: &protocol.MemberPayload_KeySolicitation{
						DeviceKey:   botConfig.encryptionDevice.DeviceKey,
						FallbackKey: botConfig.encryptionDevice.FallbackKey,
						IsNewDevice: false,
						SessionIds:  data.SessionIds,
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
		return logAndReturnErr(log, fmt.Errorf("failed to construct key solicitation stream event: %w", err))
	}

	addEventResp, err := b.client.AddEvent(
		ctx,
		&connect.Request[protocol.AddEventRequest]{
			Msg: &protocol.AddEventRequest{
				StreamId: data.StreamId,
				Event:    envelope,
			},
		},
	)
	if err != nil {
		return logAndReturnErr(log, fmt.Errorf("error adding key solicitation event to stream: %w", err))
	}
	if addErr := addEventResp.Msg.GetError(); addErr != nil {
		return logAndReturnErr(
			log,
			fmt.Errorf(
				"failed to add key solicitation event to stream: %v, %v, %v",
				addErr.Msg,
				addErr.Code,
				addErr.Funcs,
			),
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

func logAndReturnErr(log *logging.Log, err error) error {
	log.Errorw("TestAppServer error encountered", "err", err)
	return err
}

func (b *TestAppServer) respondToKeySolicitation(
	ctx context.Context,
	botIndex int,
	channelId shared.StreamId,
	solicitation *protocol.MemberPayload_KeySolicitation,
) error {
	var sessionIdBytes []byte
	if len(solicitation.SessionIds) > 0 {
		var err error
		if sessionIdBytes, err = hex.DecodeString(solicitation.SessionIds[0]); err != nil {
			return fmt.Errorf(
				"key solicitation session id 0 was not a hex string: %v, %w",
				solicitation.SessionIds[0],
				err,
			)
		}
	}
	return b.sendChannelMessage(ctx, botIndex, channelId, FormatKeySolicitationReply(solicitation), sessionIdBytes)
}

func (b *TestAppServer) respondToMembershipEvent(
	ctx context.Context,
	botIndex int,
	channelId shared.StreamId,
	membership *protocol.MemberPayload_Membership,
) error {
	placeHolderSessionBytes, err := hex.DecodeString("00000000")
	if err != nil {
		return fmt.Errorf("oops - placeholder session id hex could not be decoded: %w", err)
	}
	return b.sendChannelMessage(ctx, botIndex, channelId, FormatMembershipReply(membership), placeHolderSessionBytes)
}

func (b *TestAppServer) respondToChannelMessage(
	ctx context.Context,
	botIndex int,
	streamId shared.StreamId,
	message *protocol.EncryptedData,
	encryptionMaterial map[string]*protocol.UserInboxPayload_GroupEncryptionSessions,
) error {
	botConfig := b.botConfig[botIndex]
	log := logging.FromCtx(ctx)
	log.Debugw(
		"respondToChannelMessage message details",
		"m.SenderKey",
		message.SenderKey,
		"m.SessionIdBytes",
		message.SessionIdBytes,
		"m.SessionIdBytes (encoded)",
		hex.EncodeToString(message.SessionIdBytes),
		"m.Ciphertext",
		message.Ciphertext,
	)

	if message.SenderKey == botConfig.encryptionDevice.DeviceKey {
		return logAndReturnErr(log, fmt.Errorf(
			"we should never forward a bot-authored message back to the bot service; message ciphertext(%v), sessionId(%v)",
			message.Ciphertext,
			hex.EncodeToString(message.SessionIdBytes),
		))
	}

	sessions, ok := encryptionMaterial[hex.EncodeToString(message.GetSessionIdBytes())]
	if !ok {
		return logAndReturnErr(
			log,
			fmt.Errorf(
				"did not find sessionId %v in group encryption sessions for sent messages",
				hex.EncodeToString(message.SessionIdBytes),
			),
		)
	}

	streamIdBytes, err := shared.StreamIdFromBytes(sessions.StreamId)
	if err != nil {
		return logAndReturnErr(
			log,
			fmt.Errorf(
				"could not parse stream id: %w; message ciphertext(%v), sessionId(%v)",
				err,
				message.Ciphertext,
				hex.EncodeToString(message.SessionIdBytes),
			),
		)
	}

	if !bytes.Equal(streamIdBytes[:], streamId[:]) {
		return logAndReturnErr(
			log,
			fmt.Errorf(
				"group encryption sessions stream id does not match stream id of Messages: message sessionId(%v) and GES_SessionId(%v)",
				streamIdBytes,
				streamId,
			),
		)
	}

	if err := b.sendChannelMessage(
		ctx,
		botIndex,
		streamIdBytes,
		FormatTestAppMessageReply(
			hex.EncodeToString(message.SessionIdBytes),
			message.Ciphertext,
			sessions.Ciphertexts[botConfig.encryptionDevice.DeviceKey],
		),
		message.SessionIdBytes,
	); err != nil {
		return logAndReturnErr(log, fmt.Errorf("error sending channel message reply: %w", err))
	}
	return nil
}

func (b *TestAppServer) respondToSendMessages(
	ctx context.Context,
	botIndex int,
	data *protocol.EventPayload_Messages,
) error {
	botConfig := b.botConfig[botIndex]
	log := logging.FromCtx(ctx)
	log.Debugw(
		"respondToSendMessages",
		"numMessages",
		len(data.Messages),
		"numEncryptionMessages",
		len(data.GroupEncryptionSessionsMessages),
		"botDeviceKey",
		botConfig.encryptionDevice.DeviceKey,
		"streamId",
		data.StreamId,
	)

	sessionIdToEncryptionMaterial := make(map[string]*protocol.UserInboxPayload_GroupEncryptionSessions)
	for i, envelopeBytes := range data.GroupEncryptionSessionsMessages {
		sessions, err := parseEncryptionEnvelope(envelopeBytes)
		if err != nil {
			return logAndReturnErr(log, fmt.Errorf("error parsing encryption envelope %d: %w", i, err))
		}
		for _, sessionId := range sessions.GetSessionIds() {
			sessionIdToEncryptionMaterial[sessionId] = sessions
		}
	}

	for _, envelope := range data.Messages {
		parsedEvent, err := events.ParseEvent(envelope)
		if err != nil {
			return logAndReturnErr(log, fmt.Errorf("could not parse message envelope: %w", err))
		}
		streamEvent := parsedEvent.Event
		log.Infow("testAppServer observed streamEvent", "streamEvent", parsedEvent.Event, "envelope", envelope)

		switch payload := streamEvent.Payload.(type) {
		case *protocol.StreamEvent_MemberPayload:
			switch content := payload.MemberPayload.Content.(type) {
			case *protocol.MemberPayload_KeySolicitation_:
				{
					if err := b.respondToKeySolicitation(ctx, botIndex, shared.StreamId(data.StreamId), content.KeySolicitation); err != nil {
						return logAndReturnErr(log, fmt.Errorf("could not respond to key solicitation: %w", err))
					}
					continue
				}
			case *protocol.MemberPayload_Membership_:
				{
					if err := b.respondToMembershipEvent(ctx, botIndex, shared.StreamId(data.StreamId), content.Membership); err != nil {
						return logAndReturnErr(log, fmt.Errorf("could not respond to membership event: %w", err))
					}
				}
			default:
				return logAndReturnErr(log, fmt.Errorf("could not cast channel stream member payload content (%v)", content))
			}

		case *protocol.StreamEvent_ChannelPayload:
			switch content := payload.ChannelPayload.Content.(type) {
			case *protocol.ChannelPayload_Message:
				{
					if err := b.respondToChannelMessage(ctx, botIndex, shared.StreamId(data.StreamId), content.Message, sessionIdToEncryptionMaterial); err != nil {
						return err
					}
					continue
				}
			default:
				return logAndReturnErr(log, fmt.Errorf("could not cast channel stream payload content: (%v)", content))
			}

		default:
			return logAndReturnErr(log, fmt.Errorf("could not cast channel stream payload"))
		}
	}

	return nil
}

func (b *TestAppServer) sendChannelMessage(
	ctx context.Context,
	botIndex int,
	streamId shared.StreamId,
	message string,
	sessionIdBytes []byte,
) error {
	botConfig := b.botConfig[botIndex]
	log := logging.FromCtx(ctx)
	resp, err := b.client.GetLastMiniblockHash(
		ctx,
		&connect.Request[protocol.GetLastMiniblockHashRequest]{
			Msg: &protocol.GetLastMiniblockHashRequest{
				StreamId: streamId[:],
			},
		},
	)
	if err != nil {
		return logAndReturnErr(
			log,
			fmt.Errorf("could not get last miniblock hash of stream %v in order to post a response: %w", streamId, err),
		)
	}

	envelope, err := events.MakeEnvelopeWithPayload(
		botConfig.appWallet,
		events.Make_ChannelPayload_Message_WithSessionBytes(
			message,
			sessionIdBytes,
			botConfig.encryptionDevice.DeviceKey,
		),
		&shared.MiniblockRef{
			Hash: common.Hash(resp.Msg.Hash),
			Num:  resp.Msg.MiniblockNum,
		},
	)
	if err != nil {
		return logAndReturnErr(log, fmt.Errorf("could not construct envelope of message reply (%v): %w", message, err))
	}

	addResp, err := b.client.AddEvent(
		ctx,
		&connect.Request[protocol.AddEventRequest]{
			Msg: &protocol.AddEventRequest{
				StreamId: streamId[:],
				Event:    envelope,
			},
		},
	)
	if err != nil {
		return logAndReturnErr(log, fmt.Errorf("AddEvent failed for reply: %w", err))
	}
	if addResp.Msg.Error != nil {
		return logAndReturnErr(log, fmt.Errorf("AddEvent failed for reply: %v", addResp.Msg.Error.Msg))
	}

	return nil
}

func extractBotIndexFromUrl(path string) (int, error) {
	path = strings.TrimPrefix(path, "/")
	path = strings.TrimSuffix(path, "/")
	botIndex, err := strconv.ParseInt(path, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("Failed to parse URL path for bot index, path(%v), error(%w)", path, err)
	}
	if botIndex < 0 {
		return 0, fmt.Errorf("Invalid bot index %v; bot index must be nonnegative", botIndex)
	}
	return int(botIndex), nil
}

func (b *TestAppServer) rootHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure that the request method is POST.
	var log *logging.Log
	if b.enableLogging {
		log = logging.DefaultLogger(zapcore.DebugLevel)
	} else {
		log = logging.FromCtx(r.Context())
	}

	botIndex, err := extractBotIndexFromUrl(r.URL.Path)
	if err != nil {
		b.exitSignal <- logAndReturnErr(log, fmt.Errorf("Invalid bot index in url path: %w", err))
		http.Error(w, "Invalid bot index in URL path", http.StatusRequestedRangeNotSatisfiable)
	}
	if botIndex >= len(b.botConfig) {
		b.exitSignal <- logAndReturnErr(log, fmt.Errorf("Invalid bot index in url path: url index was %d, test app server has %d bots", botIndex, len(b.botConfig)))
		http.Error(w, "Invalid bot index in URL path; bot index too large", http.StatusRequestedRangeNotSatisfiable)
	}

	log = log.With("botIndex", botIndex)
	ctx := logging.CtxWithLog(r.Context(), log)

	if r.Method != http.MethodPost {
		b.exitSignal <- logAndReturnErr(log, fmt.Errorf("rootHandler: request method not allowed: %v", r.Method))
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	botConfig := b.botConfig[botIndex]
	if err := validateSignature(r, botConfig.hs256SecretKey, botConfig.appWallet.Address); err != nil {
		log.Errorw("invalid signature", "secretKey", botConfig.hs256SecretKey, "expectedWallet", botConfig.appWallet)
		http.Error(w, "JWT Signature Invalid", http.StatusForbidden)
	}

	if r.Header.Get("Content-Type") != "application/x-protobuf" {
		log.Errorw("Wrong content type", "contentType", r.Header.Get("Content-Type"))
		http.Error(w, "Wrong content type", http.StatusBadRequest)
		return
	}

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
	log.Infow("rootHandler: Received request", "request", &request)

	var response protocol.AppServiceResponse
	if request.Payload != nil {
		switch request.Payload.(type) {
		case *protocol.AppServiceRequest_Initialize:
			response.Payload = &protocol.AppServiceResponse_Initialize{
				Initialize: &protocol.AppServiceResponse_InitializeResponse{
					EncryptionDevice: &protocol.UserMetadataPayload_EncryptionDevice{
						DeviceKey:   botConfig.encryptionDevice.DeviceKey,
						FallbackKey: botConfig.encryptionDevice.FallbackKey,
					},
				},
			}

		case *protocol.AppServiceRequest_Events:
			for _, event := range request.GetEvents().GetEvents() {
				switch event.Payload.(type) {
				case *protocol.EventPayload_Messages_:
					if err := b.respondToSendMessages(ctx, botIndex, event.GetMessages()); err != nil {
						// An error here is considered fatal
						b.exitSignal <- logAndReturnErr(log, fmt.Errorf("unable to respond to send messages: %w", err))
						http.Error(w, fmt.Sprintf("unable to respond to sent messages: %v", err), http.StatusBadRequest)
						return
					}

				case *protocol.EventPayload_Solicitation:
					if err := b.solicitKeys(ctx, botIndex, event.GetSolicitation()); err != nil {
						b.exitSignal <- logAndReturnErr(log, fmt.Errorf("TestAppServer unable to solicit keys: %w", err))
						http.Error(w, fmt.Sprintf("TestAppServer unable to solicit keys: %v", err), http.StatusBadRequest)
						return
					}
				}
			}

		case *protocol.AppServiceRequest_Status:
			response.Payload = &protocol.AppServiceResponse_Status{
				Status: &protocol.AppServiceResponse_StatusResponse{
					FrameworkVersion: botConfig.frameworkVersion,
					DeviceKey:        botConfig.encryptionDevice.DeviceKey,
					FallbackKey:      botConfig.encryptionDevice.FallbackKey,
				},
			}

		default:
			b.exitSignal <- logAndReturnErr(log, fmt.Errorf("unrecognized action type; payload(%v)", request.Payload))
			http.Error(w, "unrecognized payload type", http.StatusBadRequest)
			return
		}
	}

	// Marshal the response message to binary format.
	respData, err := proto.Marshal(&response)
	if err != nil {
		b.exitSignal <- logAndReturnErr(log, fmt.Errorf("failed to marshal response message (%w)", err))
		http.Error(w, "Failed to marshal response message", http.StatusInternalServerError)
		return
	}

	// Set the appropriate response header.
	w.Header().Set("Content-Type", "application/x-protobuf")
	// Write the protobuf data to the response.
	if _, err = w.Write(respData); err != nil {
		b.exitSignal <- logAndReturnErr(log, fmt.Errorf("Error writing response: %w", err))
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
