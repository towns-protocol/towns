package app_registry

import (
	"context"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	ttlcache "github.com/patrickmn/go-cache"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/app_registry/sync"
	"github.com/towns-protocol/towns/core/node/app_registry/types"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/authentication"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/infra/analytics"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/track_streams"
	"github.com/towns-protocol/towns/core/node/utils"
)

const (
	appServiceChallengePrefix = "AS_AUTH:"
)

type (
	Service struct {
		authentication.AuthServiceMixin
		cfg                           config.AppRegistryConfig
		store                         *CachedEncryptedMessageQueue
		streamsTracker                track_streams.StreamsTracker
		sharedSecretDataEncryptionKey [32]byte
		appClient                     *app_client.AppClient
		riverRegistry                 *registries.RiverRegistryContract
		nodeRegistry                  nodes.NodeRegistry
		webhookStatusCache            *ttlcache.Cache
		// Base chain components for app validation
		baseChain           *crypto.Blockchain
		appRegistryContract *auth.AppRegistryContract
		// Cleanup job for enqueued messages
		cleaner *EnqueuedMessagesCleaner
	}
)

var _ protocolconnect.AppRegistryServiceHandler = (*Service)(nil)

func NewService(
	ctx context.Context,
	cfg config.AppRegistryConfig,
	onChainConfig crypto.OnChainConfiguration,
	store storage.AppRegistryStore,
	riverRegistry *registries.RiverRegistryContract,
	nodes []nodes.NodeRegistry,
	metrics infra.MetricsFactory,
	listener track_streams.StreamEventListener,
	webhookHttpClient *http.Client,
	baseChain *crypto.Blockchain,
	appRegistryContractConfig *config.ContractConfig,
	otelTracer trace.Tracer,
) (*Service, error) {
	if len(nodes) < 1 {
		return nil, base.RiverError(
			Err_INVALID_ARGUMENT,
			"App registry service initialized with insufficient node registries",
		)
	}

	// Trim optional "0x" prefix for shared secret data encryption key
	if len(cfg.SharedSecretDataEncryptionKey) > 2 && strings.ToLower(cfg.SharedSecretDataEncryptionKey[0:2]) == "0x" {
		cfg.SharedSecretDataEncryptionKey = cfg.SharedSecretDataEncryptionKey[2:]
	}

	sharedSecretDataEncryptionKey, err := hex.DecodeString(cfg.SharedSecretDataEncryptionKey)
	if err != nil || len(sharedSecretDataEncryptionKey) != 32 {
		return nil, base.AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("AppRegistryConfig SharedSecretDataEncryptionKey must be a 32-byte key encoded as hex")
	}
	fixedWidthDataEncryptionKey := [32]byte(sharedSecretDataEncryptionKey)

	streamTrackerNodeRegistries := nodes
	if len(nodes) > 1 {
		streamTrackerNodeRegistries = nodes[1:]
	}
	appClient := app_client.NewAppClient(webhookHttpClient, cfg.AllowInsecureWebhooks)
	cache, err := NewCachedEncryptedMessageQueue(
		ctx,
		store,
		NewAppDispatcher(ctx, &cfg, appClient, fixedWidthDataEncryptionKey),
	)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("Unable to create CachedEncryptedMessageQueue")
	}

	if listener == nil {
		analyticsClient := analytics.NewRudderstack(ctx, cfg.RudderstackWriteKey, cfg.RudderstackDataPlaneURL)
		listener = NewAppMessageProcessor(cache, analyticsClient)
	}

	cookieStore := track_streams.NewPostgresStreamCookieStore(store.Pool(), "stream_sync_cookies")

	tracker, err := sync.NewAppRegistryStreamsTracker(
		ctx,
		cfg,
		onChainConfig,
		riverRegistry,
		streamTrackerNodeRegistries,
		metrics,
		listener,
		cache,
		cookieStore,
		otelTracer,
	)
	if err != nil {
		return nil, err
	}

	s := &Service{
		cfg:                           cfg,
		store:                         cache,
		streamsTracker:                tracker,
		sharedSecretDataEncryptionKey: fixedWidthDataEncryptionKey,
		appClient:                     appClient,
		riverRegistry:                 riverRegistry,
		nodeRegistry:                  nodes[0],
		webhookStatusCache:            ttlcache.New(2*time.Second, 1*time.Minute),
		cleaner:                       NewEnqueuedMessagesCleaner(store, cfg.EnqueuedMessageRetention, metrics),
	}

	// Initialize app registry contract if base chain is provided and configured
	if baseChain != nil {
		if appRegistryContractConfig == nil {
			return nil, base.RiverError(Err_BAD_CONFIG, "No app registry contract was configured for the service")
		}
		s.baseChain = baseChain

		// Initialize app registry contract on Base chain
		if appRegistryContract, err := auth.NewAppRegistryContract(
			ctx,
			appRegistryContractConfig,
			baseChain.Client,
		); err != nil {
			return nil, base.AsRiverError(err, Err_INTERNAL).
				Message("Failed to initialize app registry contract on Base chain").
				Tag("contractAddress", appRegistryContractConfig.Address)
		} else {
			s.appRegistryContract = appRegistryContract
		}
	}

	if err := s.InitAuthentication(appServiceChallengePrefix, &cfg.Authentication); err != nil {
		return nil, err
	}
	return s, nil
}

// validateAddress validates any address field and returns appropriate error
func validateAddress(addrBytes []byte, fieldName string, funcName string) (common.Address, error) {
	addr, err := base.BytesToAddress(addrBytes)
	if err != nil {
		return common.Address{}, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message(fmt.Sprintf("invalid %s", fieldName)).
			Tag(fieldName, addrBytes).
			Func(funcName)
	}
	return addr, nil
}

// validateAppAndGetInfo validates app ID and retrieves app info
func (s *Service) validateAppAndGetInfo(
	ctx context.Context,
	appIdBytes []byte,
	funcName string,
) (common.Address, *storage.AppInfo, error) {
	app, err := validateAddress(appIdBytes, "app id", funcName)
	if err != nil {
		return common.Address{}, nil, err
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		return common.Address{}, nil, base.WrapRiverError(Err_INTERNAL, err).
			Message("could not determine app owner").
			Tag("appId", app).
			Func(funcName)
	}

	return app, appInfo, nil
}

// checkAppPermission checks if authenticated user has permission to act as app.
// If owner is zero address, only checks if user is the app itself.
// If owner is provided, checks if user is either the app or the owner.
func (s *Service) checkAppPermission(
	ctx context.Context,
	app common.Address,
	owner common.Address,
	funcName string,
) (common.Address, error) {
	userId := authentication.UserFromAuthenticatedContext(ctx)

	// If owner is zero address, only check if user is the app
	if (owner == (common.Address{}) && app != userId) || (app != userId && owner != userId) {
		msg := "authenticated user must be app or owner"
		if owner == (common.Address{}) {
			msg = "authenticated user must be app"
		}
		return common.Address{}, base.RiverError(Err_PERMISSION_DENIED, msg).
			Tag("app", app).
			Tag("userId", userId).
			Tag("ownerId", owner).
			Func(funcName)
	}
	return userId, nil
}

// generateAndEncryptSecret generates a new shared secret and encrypts it
func (s *Service) generateAndEncryptSecret(funcName string) ([32]byte, [32]byte, error) {
	appSecret, err := genHS256SharedSecret()
	if err != nil {
		return [32]byte{}, [32]byte{}, base.AsRiverError(err, Err_INTERNAL).
			Message("error generating shared secret for app").
			Func(funcName)
	}

	encrypted, err := encryptSharedSecret(appSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return [32]byte{}, [32]byte{}, base.AsRiverError(err, Err_INTERNAL).
			Message("error encrypting shared secret for app").
			Func(funcName)
	}

	return appSecret, encrypted, nil
}

// decryptAppSecret decrypts the app's shared secret
func (s *Service) decryptAppSecret(
	encryptedSecret [32]byte,
	app common.Address,
	funcName string,
) ([32]byte, error) {
	decryptedSecret, err := decryptSharedSecret(encryptedSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return [32]byte{}, base.WrapRiverError(Err_INTERNAL, err).
			Message("Unable to decrypt app shared secret from db").
			Tag("appId", app).
			Func(funcName)
	}
	return decryptedSecret, nil
}

// validateAppWithOwnerPermission validates app ID, retrieves app info, and checks if the
// authenticated user is either the app itself or the app owner.
// This is a convenience function that combines validateAppAndGetInfo and checkAppPermission.
func (s *Service) validateAppWithOwnerPermission(
	ctx context.Context,
	appIdBytes []byte,
	funcName string,
) (app common.Address, appInfo *storage.AppInfo, userId common.Address, err error) {
	app, appInfo, err = s.validateAppAndGetInfo(ctx, appIdBytes, funcName)
	if err != nil {
		return common.Address{}, nil, common.Address{}, err
	}

	userId, err = s.checkAppPermission(ctx, app, appInfo.Owner, funcName)
	if err != nil {
		return common.Address{}, nil, common.Address{}, err
	}

	return app, appInfo, userId, nil
}

func (s *Service) SetAppSettings(
	ctx context.Context,
	req *connect.Request[SetAppSettingsRequest],
) (
	*connect.Response[SetAppSettingsResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "SetAppSettings"))

	app, _, userId, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "SetAppSettings")
	if err != nil {
		return nil, err
	}

	if err := s.store.UpdateSettings(ctx, app, types.ProtocolToStorageAppSettings(req.Msg.GetSettings())); err != nil {
		return nil, base.RiverError(Err_DB_OPERATION_FAILURE, "Unable to update app forward setting").
			Tag("appId", app).
			Tag("userId", userId).
			Func("SetAppSettings")
	}

	return &connect.Response[SetAppSettingsResponse]{
		Msg: &SetAppSettingsResponse{},
	}, nil
}

func (s *Service) GetAppSettings(
	ctx context.Context,
	req *connect.Request[GetAppSettingsRequest],
) (
	*connect.Response[GetAppSettingsResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "GetAppSettings"))

	_, appInfo, _, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "GetAppSettings")
	if err != nil {
		return nil, err
	}

	response := &GetAppSettingsResponse{
		Settings: types.StorageToProtocolAppSettings(appInfo.Settings),
	}

	if appInfo.WebhookUrl != "" {
		response.WebhookUrl = &appInfo.WebhookUrl
	}

	return &connect.Response[GetAppSettingsResponse]{
		Msg: response,
	}, nil
}

func (s *Service) Start(ctx context.Context) {
	log := logging.FromCtx(ctx).With("func", "AppRegistryService.Start")

	go func() {
		for {
			log.Infow("Start app registry streams tracker")

			if err := s.streamsTracker.Run(ctx); err != nil {
				log.Errorw("tracking streams failed", "error", err)
			}

			select {
			case <-time.After(10 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}
	}()

	// Start the enqueued messages cleanup job
	go s.cleaner.Run(ctx)
}

func (s *Service) RotateSecret(
	ctx context.Context,
	req *connect.Request[RotateSecretRequest],
) (
	*connect.Response[RotateSecretResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "RotateSecret"))

	app, _, _, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "RotateSecret")
	if err != nil {
		return nil, err
	}

	// Generate a secret, encrypt it, and store the app record in pg.
	appSecret, encrypted, err := s.generateAndEncryptSecret("RotateSecret")
	if err != nil {
		return nil, err
	}

	if err := s.store.RotateSharedSecret(ctx, app, encrypted); err != nil {
		return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Message("Error storing encrypted shared secret for app").
			Tag("appId", app).
			Func("RotateSecret")
	}

	return &connect.Response[RotateSecretResponse]{
		Msg: &RotateSecretResponse{
			Hs256SharedSecret: appSecret[:],
		},
	}, nil
}

func (s *Service) GetSession(
	ctx context.Context,
	req *connect.Request[GetSessionRequest],
) (
	*connect.Response[GetSessionResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "GetSession"))

	app, err := validateAddress(req.Msg.AppId, "app id", "GetSession")
	if err != nil {
		return nil, err
	}

	// Pass zero address for owner to check app-only permission
	_, err = s.checkAppPermission(ctx, app, common.Address{}, "GetSession")
	if err != nil {
		return nil, err
	}

	var envelopeBytes []byte
	switch identifier := req.Msg.Identifier.(type) {
	case *GetSessionRequest_SessionId:
		envelopeBytes, err = s.store.GetSessionKey(ctx, app, identifier.SessionId)
		if err != nil {
			return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE).
				Tag("sessionId", identifier.SessionId).Tag("appId", app).Func("GetSession")
		}
	case *GetSessionRequest_StreamId:
		streamId, err := shared.StreamIdFromBytes(identifier.StreamId)
		if err != nil {
			return nil, base.AsRiverError(err, Err_INVALID_ARGUMENT).
				Tag("streamId", identifier.StreamId).Tag("appId", app).Func("GetSession")
		}
		envelopeBytes, err = s.store.GetSessionKeyForStream(ctx, app, streamId)
		if err != nil {
			return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE).
				Tag("streamId", streamId).Tag("appId", app).Func("GetSession")
		}
	default:
		return nil, base.RiverError(
			Err_INVALID_ARGUMENT,
			"Either session_id or stream_id must be provided",
		).Tag("appId", app).Func("GetSession")
	}

	var envelope Envelope
	if err = proto.Unmarshal(envelopeBytes, &envelope); err != nil {
		return nil, base.AsRiverError(err, Err_BAD_EVENT).Message("Could not unmarshal encryption envelope").
			Tag("appId", app).Func("GetSession")
	}

	return &connect.Response[GetSessionResponse]{
		Msg: &GetSessionResponse{
			GroupEncryptionSessions: &envelope,
		},
	}, nil
}

func (s *Service) Register(
	ctx context.Context,
	req *connect.Request[RegisterRequest],
) (
	*connect.Response[RegisterResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "Register"))

	app, err := validateAddress(req.Msg.AppId, "app id", "Register")
	if err != nil {
		return nil, err
	}

	owner, err := validateAddress(req.Msg.AppOwnerId, "owner id", "Register")
	if err != nil {
		return nil, err
	}

	// Check if authenticated user is the owner
	userId := authentication.UserFromAuthenticatedContext(ctx)
	if owner != userId {
		return nil, base.RiverError(Err_PERMISSION_DENIED,
			"authenticated user must be app owner").
			Tag("owner", owner).
			Tag("userId", userId).
			Func("Register")
	}

	// Validate metadata
	metadata := req.Msg.GetMetadata()
	if err := types.ValidateAppMetadata(metadata); err != nil {
		return nil, base.AsRiverError(err, Err_INVALID_ARGUMENT).
			Tag("appId", app).Func("Register")
	}

	// Generate a secret, encrypt it, and store the app record in pg.
	appSecret, encrypted, err := s.generateAndEncryptSecret("Register")
	if err != nil {
		return nil, err
	}

	if err := s.validateAppContractAddress(ctx, app); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("Error validating app contract address in user stream")
	}

	if err := s.store.CreateApp(ctx, owner, app, types.ProtocolToStorageAppSettings(req.Msg.GetSettings()), types.ProtocolToStorageAppMetadata(metadata), encrypted); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("Error creating app in database")
	}

	return &connect.Response[RegisterResponse]{
		Msg: &RegisterResponse{
			Hs256SharedSecret: appSecret[:],
		},
	}, nil
}

// validateAppContractAddress waits up to 10 seconds for the app's user stream to become
// available and validates that the app_address in the inception event matches the app registry contract on Base.
func (s *Service) validateAppContractAddress(
	ctx context.Context,
	appId common.Address,
) error {
	// Skip validation if Base chain is not configured
	if s.baseChain == nil {
		return nil
	}

	log := logging.FromCtx(ctx)
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	userStreamId := shared.UserStreamIdFromAddr(appId)
	defer cancel()

	var delay time.Duration
	var view *events.StreamView
	var loopExitErr error

waitLoop:
	for {
		if view != nil {
			break
		}
		delay = max(2*delay, 20*time.Millisecond)
		select {
		case <-ctx.Done():
			loopExitErr = base.AsRiverError(ctx.Err(), Err_NOT_FOUND).Message("Timed out while waiting for user stream availability")
			break waitLoop
		case <-time.After(delay):
			stream, err := s.riverRegistry.StreamRegistry.GetStreamOnLatestBlock(ctx, userStreamId)
			if err != nil {
				continue
			}
			nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
			streamResponse, err := utils.PeerNodeRequestWithRetries(
				ctx,
				nodes,
				func(ctx context.Context, stub protocolconnect.StreamServiceClient, _ common.Address) (*connect.Response[GetStreamResponse], error) {
					ret, err := stub.GetStream(
						ctx,
						&connect.Request[GetStreamRequest]{
							Msg: &GetStreamRequest{
								StreamId: userStreamId[:],
							},
						},
					)
					if err != nil {
						return nil, err
					}
					return connect.NewResponse(ret.Msg), nil
				},
				1,
				s.nodeRegistry,
			)
			if err != nil {
				log.Debugw("Error fetching user stream for app", "error", err, "streamId", userStreamId, "appId", appId)
				continue
			}
			view, loopExitErr = events.MakeRemoteStreamView(streamResponse.Msg.Stream)
			if loopExitErr != nil {
				break waitLoop
			}
		}
	}

	if view == nil {
		log.Errorw("no user stream available for app", "appId", appId, "stream", userStreamId)
		return base.AsRiverError(loopExitErr, Err_NOT_FOUND).
			Message("user stream for app not found").
			Tag("appId", appId).
			Tag("userStreamId", userStreamId)
	}

	// Get the user snapshot content and extract app_address from inception
	userContent, err := view.GetUserSnapshotContent()
	if err != nil || userContent == nil || userContent.GetInception() == nil {
		return base.RiverError(Err_NOT_FOUND, "user stream inception not found").
			Tag("appId", appId).
			Tag("userStreamId", userStreamId)
	}

	inception := userContent.GetInception()
	appAddress := inception.GetAppAddress()

	// Verify app_address is not zero
	if len(appAddress) == 0 {
		return base.RiverError(Err_INVALID_ARGUMENT, "app_address is not set in user stream inception").
			Tag("appId", appId).
			Tag("userStreamId", userStreamId)
	}

	var appContractAddress common.Address
	if appContractAddress, err = base.BytesToAddress(appAddress); err != nil {
		return base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app_address in user stream inception").
			Tag("appId", appId).
			Tag("appAddress", appAddress)
	}

	// Verify the app is registered with the client address in the Base app registry contract
	isRegistered, err := s.appRegistryContract.IsRegisteredAppWithClient(ctx, appContractAddress, appId)
	if err != nil {
		return base.AsRiverError(err, Err_CANNOT_CALL_CONTRACT).
			Message("Failed to check app registration on Base chain").
			Tag("appId", appId).
			Tag("appContractAddress", appContractAddress)
	}

	if !isRegistered {
		return base.RiverError(Err_PERMISSION_DENIED, "app is not registered with client address in Base app registry contract").
			Tag("appId", appId).
			Tag("appContractAddress", appContractAddress)
	}

	log.Debugw("App successfully validated against Base chain app registry contract",
		"appId", appId,
		"appContractAddress", appContractAddress)

	return nil
}

// waitForAppEncryption device waits up to 10 seconds for the app's user metadata stream to become
// available, first in the registry, and then on one of the peer nodes that host it. Once the stream
// is available, it looks for the first encryption device in the stream and returns it. The stream
// is expected to have exactly 1 encryption device if it is available.
func (s *Service) waitForAppEncryptionDevice(
	ctx context.Context,
	appId common.Address,
) (*storage.EncryptionDevice, error) {
	log := logging.FromCtx(ctx)
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	userMetadataStreamId := shared.UserMetadataStreamIdFromAddr(appId)
	defer cancel()

	var delay time.Duration
	var encryptionDevices []*UserMetadataPayload_EncryptionDevice
	var loopExitErr error
	var view *events.StreamView
waitLoop:
	for {
		if view != nil {
			break
		}
		delay = max(2*delay, 20*time.Millisecond)
		select {
		case <-ctx.Done():
			loopExitErr = base.AsRiverError(ctx.Err(), Err_NOT_FOUND).Message("Timed out while waiting for stream availability")
			break waitLoop
		case <-time.After(delay):
			stream, err := s.riverRegistry.StreamRegistry.GetStreamOnLatestBlock(ctx, userMetadataStreamId)
			if err != nil {
				continue
			}
			nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
			streamResponse, err := utils.PeerNodeRequestWithRetries(
				ctx,
				nodes,
				func(ctx context.Context, stub protocolconnect.StreamServiceClient, _ common.Address) (*connect.Response[GetStreamResponse], error) {
					ret, err := stub.GetStream(
						ctx,
						&connect.Request[GetStreamRequest]{
							Msg: &GetStreamRequest{
								StreamId: userMetadataStreamId[:],
							},
						},
					)
					if err != nil {
						return nil, err
					}
					return connect.NewResponse(ret.Msg), nil
				},
				1,
				s.nodeRegistry,
			)
			if err != nil {
				log.Warnw("Error fetching user metadata stream for app", "error", err, "streamId", userMetadataStreamId, "appId", appId)
				continue
			}
			view, loopExitErr = events.MakeRemoteStreamView(streamResponse.Msg.Stream)
			if loopExitErr != nil {
				break waitLoop
			}
			encryptionDevices, loopExitErr = view.GetEncryptionDevices()
			if loopExitErr != nil {
				break waitLoop
			}
		}
	}

	if len(encryptionDevices) == 0 {
		log.Errorw("no usermetadata stream available for app", "appId", appId, "stream", userMetadataStreamId)
		return nil, base.AsRiverError(loopExitErr, Err_NOT_FOUND).
			Message("encryption device for app not found").
			Tag("appId", appId).
			Tag("userMetadataStreamId", userMetadataStreamId)
	} else {
		return &storage.EncryptionDevice{
			DeviceKey:   encryptionDevices[0].DeviceKey,
			FallbackKey: encryptionDevices[0].FallbackKey,
		}, nil
	}
}

func (s *Service) RegisterWebhook(
	ctx context.Context,
	req *connect.Request[RegisterWebhookRequest],
) (
	*connect.Response[RegisterWebhookResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "RegisterWebhook"))

	app, appInfo, _, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "RegisterWebhook")
	if err != nil {
		return nil, err
	}

	defaultEncryptionDevice, err := s.waitForAppEncryptionDevice(ctx, app)
	if err != nil {
		return nil, err
	}

	decryptedSecret, err := s.decryptAppSecret(appInfo.EncryptedSecret, app, "RegisterWebhook")
	if err != nil {
		return nil, err
	}

	webhook := req.Msg.WebhookUrl
	serverEncryptionDevice, err := s.appClient.InitializeWebhook(
		ctx,
		app,
		decryptedSecret,
		webhook,
	)
	if err != nil {
		return nil, base.WrapRiverError(Err_UNKNOWN, err).
			Message("Unable to initialize app service").
			Func("RegisterWebhook")
	}

	if serverEncryptionDevice.DeviceKey != defaultEncryptionDevice.DeviceKey ||
		serverEncryptionDevice.FallbackKey != defaultEncryptionDevice.FallbackKey {
		return nil, base.RiverError(
			Err_BAD_ENCRYPTION_DEVICE,
			"webhook encryption device does not match default device detected by app registy service",
		).
			Tag("expectedDeviceKey", defaultEncryptionDevice.DeviceKey).
			Tag("responseDeviceKey", serverEncryptionDevice.DeviceKey).
			Tag("expectedFallbackKey", defaultEncryptionDevice.FallbackKey).
			Tag("responseFallbackKey", serverEncryptionDevice.FallbackKey).
			Func("RegisterWebhook")
	}

	// Bust the status cache since the webhook may be changing. This method can be called
	// many times to update the webhook.
	s.webhookStatusCache.Delete(app.String())

	// Store the app record in pg
	if err := s.store.RegisterWebhook(ctx, app, webhook, defaultEncryptionDevice.DeviceKey, defaultEncryptionDevice.FallbackKey); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Func("RegisterWebhook")
	}

	// Start tracking the bot's user inbox stream for encryption keys.
	// This must happen here (and not in Register), since the service subscribe to all bots inbox
	// stream on start up, only if the bot has a registered webhook. if we subscribe on the Register rpc
	// and not here on RegisterWebhook rpc, if the service restarts between those two calls, it will
	// not subscribe to the user inbox stream of the bot until the next restart
	if _, err := s.streamsTracker.AddStream(shared.UserInboxStreamIdFromAddr(app), track_streams.ApplyHistoricalContent{Enabled: true}); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("Error subscribing to app's user inbox stream to watch for keys").
			Tag("UserInboxStreamId", shared.UserInboxStreamIdFromAddr(app))
	}

	return &connect.Response[RegisterWebhookResponse]{}, nil
}

func (s *Service) GetStatus(
	ctx context.Context,
	req *connect.Request[GetStatusRequest],
) (
	resp *connect.Response[GetStatusResponse],
	err error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "GetStatus"))

	defer func() {
		if err != nil {
			err = base.AsRiverError(err, Err_INTERNAL).Func("GetStatus")
		}
	}()

	app, err := validateAddress(req.Msg.AppId, "app id", "GetStatus")
	if err != nil {
		return nil, err
	}

	// Check for webhookStatusCached webhookStatus response
	if webhookStatusCached, exists := s.webhookStatusCache.Get(app.String()); exists {
		if webhookStatus, exists := webhookStatusCached.(*AppServiceResponse_StatusResponse); exists {
			appInfo, err := s.store.GetAppInfo(ctx, app)
			if err != nil {
				return nil, err
			}
			return &connect.Response[GetStatusResponse]{
				Msg: &GetStatusResponse{
					IsRegistered:  true,
					ValidResponse: true,
					Status:        webhookStatus,
					Active:        appInfo.Active,
				},
			}, nil
		}
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		// App does not exist
		if base.IsRiverErrorCode(err, Err_NOT_FOUND) {
			return &connect.Response[GetStatusResponse]{
				Msg: &GetStatusResponse{
					IsRegistered: false,
				},
			}, nil
		} else {
			// Error fetching app
			return nil, base.WrapRiverError(Err_INTERNAL, err).
				Message("unable to fetch info for app").
				Tag("app_id", app)
		}
	}

	decryptedSecret, err := s.decryptAppSecret(appInfo.EncryptedSecret, app, "GetStatus")
	if err != nil {
		return nil, err
	}

	webhookStatus, err := s.appClient.GetWebhookStatus(ctx, appInfo.WebhookUrl, app, decryptedSecret)
	if err != nil {
		if base.IsRiverErrorCode(err, Err_MALFORMED_WEBHOOK_RESPONSE) ||
			base.IsRiverErrorCode(err, Err_CANNOT_CALL_WEBHOOK) {
			// App is registered but webhook is unavailable or returned an invalid response
			return &connect.Response[GetStatusResponse]{
				Msg: &GetStatusResponse{
					IsRegistered:  true,
					ValidResponse: false,
					Active:        appInfo.Active,
				},
			}, nil
		} else {
			return nil, base.WrapRiverError(Err_INTERNAL, err).
				Message("Unable to call app webhook").
				Tag("app_id", app)
		}
	}

	s.webhookStatusCache.Set(app.String(), webhookStatus, 0)

	return &connect.Response[GetStatusResponse]{
		Msg: &GetStatusResponse{
			IsRegistered:  true,
			ValidResponse: true,
			Status:        webhookStatus,
			Active:        appInfo.Active,
		},
	}, nil
}

func (s *Service) UpdateAppMetadata(
	ctx context.Context,
	req *connect.Request[UpdateAppMetadataRequest],
) (
	*connect.Response[UpdateAppMetadataResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "UpdateAppMetadata"))

	// Validate partial metadata update first
	metadata := req.Msg.GetMetadata()
	updateMask := req.Msg.GetUpdateMask()

	app, _, userId, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "UpdateAppMetadata")
	if err != nil {
		return nil, err
	}

	if err := types.ValidateAppMetadataUpdate(metadata, updateMask); err != nil {
		return nil, base.AsRiverError(err, Err_INVALID_ARGUMENT).
			Tag("appId", app).Func("UpdateAppMetadata").Message("invalid app metadata update")
	}
	logging.FromCtx(ctx).Infow("meta", "metadata", metadata, "updateMask", updateMask)

	// Perform partial update (conversion to storage format happens inside)
	err = s.store.SetAppMetadataPartial(ctx, app, metadata, updateMask)
	if err != nil {
		return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Message("Unable to update app metadata").
			Tag("appId", app).
			Tag("userId", userId).
			Tag("metadata", metadata).
			Tag("updateMask", updateMask).
			Func("UpdateAppMetadata")
	}

	logging.FromCtx(ctx).Infow("Updated app metadata")

	return &connect.Response[UpdateAppMetadataResponse]{
		Msg: &UpdateAppMetadataResponse{},
	}, nil
}

// GetAppMetadata does not require authentication.
func (s *Service) GetAppMetadata(
	ctx context.Context,
	req *connect.Request[GetAppMetadataRequest],
) (
	*connect.Response[GetAppMetadataResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "GetAppMetadata"))

	app, err := validateAddress(req.Msg.AppId, "app id", "GetAppMetadata")
	if err != nil {
		return nil, err
	}

	metadata, err := s.store.GetAppMetadata(ctx, app)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not get app metadata").
			Tag("appId", app).Func("GetAppMetadata")
	}

	return &connect.Response[GetAppMetadataResponse]{
		Msg: &GetAppMetadataResponse{
			Metadata: types.StorageToProtocolAppMetadata(*metadata),
		},
	}, nil
}

// ValidateBotName does not require authentication.
func (s *Service) ValidateBotName(
	ctx context.Context,
	req *connect.Request[ValidateBotNameRequest],
) (
	*connect.Response[ValidateBotNameResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "ValidateBotName"))

	// Validate username format
	if err := types.ValidateBotUsername(req.Msg.GetUsername()); err != nil {
		return &connect.Response[ValidateBotNameResponse]{
			Msg: &ValidateBotNameResponse{
				IsAvailable:  false,
				ErrorMessage: err.Error(),
			},
		}, nil
	}

	// Check if username is already taken
	isAvailable, err := s.store.IsUsernameAvailable(ctx, req.Msg.Username)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("failed to check bot username availability").
			Tag("username", req.Msg.Username).
			Func("ValidateBotName")
	}

	if !isAvailable {
		return &connect.Response[ValidateBotNameResponse]{
			Msg: &ValidateBotNameResponse{
				IsAvailable:  false,
				ErrorMessage: "username is already taken",
			},
		}, nil
	}

	return &connect.Response[ValidateBotNameResponse]{
		Msg: &ValidateBotNameResponse{
			IsAvailable: true,
		},
	}, nil
}

func (s *Service) SetAppActiveStatus(
	ctx context.Context,
	req *connect.Request[SetAppActiveStatusRequest],
) (
	*connect.Response[SetAppActiveStatusResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "SetAppActiveStatus"))

	app, _, userId, err := s.validateAppWithOwnerPermission(ctx, req.Msg.AppId, "SetAppActiveStatus")
	if err != nil {
		return nil, err
	}

	// Update the app active status
	err = s.store.SetAppActiveStatus(ctx, app, req.Msg.Active)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("failed to update app active status").
			Tag("appId", app).
			Tag("active", req.Msg.Active).
			Func("SetAppActiveStatus")
	}

	// Clear status cache so next GetStatus reflects the change
	s.webhookStatusCache.Delete(app.String())

	logging.FromCtx(ctx).Infow("Updated app active status",
		"appId", app,
		"active", req.Msg.Active,
		"userId", userId,
	)

	return &connect.Response[SetAppActiveStatusResponse]{
		Msg: &SetAppActiveStatusResponse{},
	}, nil
}

func (s *Service) GetAppActiveStatus(
	ctx context.Context,
	req *connect.Request[GetAppActiveStatusRequest],
) (
	*connect.Response[GetAppActiveStatusResponse],
	error,
) {
	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("method", "GetAppActiveStatus"))

	app, err := validateAddress(req.Msg.AppId, "app id", "GetAppActiveStatus")
	if err != nil {
		return nil, err
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		return nil, base.WrapRiverError(Err_NOT_FOUND, err).
			Message("app not found").
			Tag("appId", app).
			Func("GetAppActiveStatus")
	}

	return &connect.Response[GetAppActiveStatusResponse]{
		Msg: &GetAppActiveStatusResponse{
			Active: appInfo.Active,
		},
	}, nil
}
