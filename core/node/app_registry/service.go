package app_registry

import (
	"context"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	ttlcache "github.com/patrickmn/go-cache"
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
		statusCache                   *ttlcache.Cache
		// Base chain components for app validation
		baseChain           *crypto.Blockchain
		appRegistryContract *auth.AppRegistryContract
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
		listener = NewAppMessageProcessor(ctx, cache)
	}

	tracker, err := sync.NewAppRegistryStreamsTracker(
		ctx,
		cfg,
		onChainConfig,
		riverRegistry,
		streamTrackerNodeRegistries,
		metrics,
		listener,
		cache,
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
		statusCache:                   ttlcache.New(2*time.Second, 1*time.Minute),
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

func (s *Service) SetAppSettings(
	ctx context.Context,
	req *connect.Request[SetAppSettingsRequest],
) (
	*connect.Response[SetAppSettingsResponse],
	error,
) {
	var app common.Address
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").Tag("appId", req.Msg.AppId).Func("SetSettings")
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not determine app owner").
			Tag("appId", app).Func("SetSettings")
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if app != userId && appInfo.Owner != userId {
		return nil, base.RiverError(Err_PERMISSION_DENIED, "authenticated user must be app or owner").
			Tag("appId", app).Tag("userId", userId).Tag("ownerId", appInfo.Owner).Func("SetSettings")
	}

	if err := s.store.UpdateSettings(ctx, app, types.ProtocolToStorageAppSettings(req.Msg.GetSettings())); err != nil {
		return nil, base.RiverError(Err_DB_OPERATION_FAILURE, "Unable to update app forward setting").
			Tag("appId", app).
			Tag("userId", userId).
			Func("SetSettings")
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
	var app common.Address
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").Tag("appId", req.Msg.AppId).Func("SetSettings")
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not determine app owner").
			Tag("appId", app).Func("SetSettings")
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if app != userId && appInfo.Owner != userId {
		return nil, base.RiverError(Err_PERMISSION_DENIED, "authenticated user must be app or owner").
			Tag("appId", app).Tag("userId", userId).Tag("ownerId", appInfo.Owner).Func("SetSettings")
	}

	return &connect.Response[GetAppSettingsResponse]{
		Msg: &GetAppSettingsResponse{
			Settings: types.StorageToProtocolAppSettings(appInfo.Settings),
		},
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
}

func (s *Service) RotateSecret(
	ctx context.Context,
	req *connect.Request[RotateSecretRequest],
) (
	*connect.Response[RotateSecretResponse],
	error,
) {
	var app common.Address
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").Tag("appId", req.Msg.AppId).Func("GetSession")
	}

	appInfo, err := s.store.GetAppInfo(ctx, app)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not determine app owner").
			Tag("appId", app).Func("GetSession")
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if app != userId && appInfo.Owner != userId {
		return nil, base.RiverError(Err_PERMISSION_DENIED, "authenticated user must be app or owner").
			Tag("appId", app).Tag("userId", userId).Tag("ownerId", appInfo.Owner).Func("GetSession")
	}

	// Generate a secret, encrypt it, and store the app record in pg.
	appSecret, err := genHS256SharedSecret()
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("error generating shared secret for app").
			Tag("appId", app).Func("GetSession")
	}

	encrypted, err := encryptSharedSecret(appSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("error encrypting shared secret for app").
			Tag("appId", app).Func("GetSession")
	}

	if err := s.store.RotateSharedSecret(ctx, app, encrypted); err != nil {
		return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Message("Error storing encrypted shared secret for app").
			Tag("appId", app).Func("GetSession")
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
	var app common.Address
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").Tag("appId", req.Msg.AppId).Func("GetSession")
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if app != userId {
		return nil, base.RiverError(Err_PERMISSION_DENIED, "authenticated user must be app").
			Tag("app", app).Tag("userId", userId).Func("GetSession")
	}

	if req.Msg.SessionId == "" {
		return nil, base.RiverError(
			Err_INVALID_ARGUMENT,
			"Invalid session id",
		).Tag("sessionId", req.Msg.SessionId).Tag("appId", app).Func("GetSession")
	}

	envelopeBytes, err := s.store.GetSessionKey(ctx, app, req.Msg.SessionId)
	if err != nil {
		return nil, base.AsRiverError(err, Err_DB_OPERATION_FAILURE)
	}

	var envelope Envelope
	if err = proto.Unmarshal(envelopeBytes, &envelope); err != nil {
		return nil, base.AsRiverError(err, Err_BAD_EVENT).Message("Could not marshal encryption envelope").
			Tag("sessionId", req.Msg.SessionId).Tag("appId", app).Func("GetSession")
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
	var app, owner common.Address
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").
			Tag("appId", req.Msg.AppId)
	}

	if owner, err = base.BytesToAddress(req.Msg.AppOwnerId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid owner id").
			Tag("ownerId", req.Msg.AppOwnerId)
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if owner != userId {
		return nil, base.RiverError(
			Err_PERMISSION_DENIED,
			"authenticated user must be app owner",
			"owner",
			owner,
			"userId",
			userId,
		)
	}

	// Generate a secret, encrypt it, and store the app record in pg.
	appSecret, err := genHS256SharedSecret()
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("error generating shared secret for app")
	}

	encrypted, err := encryptSharedSecret(appSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("error encrypting shared secret for app")
	}

	if err := s.validateAppContractAddress(ctx, app); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("Error validating app contract address in user stream")
	}

	if err := s.store.CreateApp(ctx, owner, app, types.ProtocolToStorageAppSettings(req.Msg.GetSettings()), encrypted); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("Error creating app in database")
	}

	if err := s.streamsTracker.AddStream(shared.UserInboxStreamIdFromAddress(app)); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("Error subscribing to app's user inbox stream to watch for keys").
			Tag("UserInboxStreamId", shared.UserInboxStreamIdFromAddress(app))
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
			stream, err := s.riverRegistry.StreamRegistry.GetStream(&bind.CallOpts{Context: ctx}, userStreamId)
			if err != nil {
				continue
			}
			nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
			streamResponse, err := utils.PeerNodeRequestWithRetries(
				ctx,
				nodes,
				func(ctx context.Context, stub protocolconnect.StreamServiceClient) (*connect.Response[GetStreamResponse], error) {
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
	userMetadataStreamId := shared.UserMetadataStreamIdFromAddress(appId)
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
			stream, err := s.riverRegistry.StreamRegistry.GetStream(&bind.CallOpts{Context: ctx}, userMetadataStreamId)
			if err != nil {
				continue
			}
			nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
			streamResponse, err := utils.PeerNodeRequestWithRetries(
				ctx,
				nodes,
				func(ctx context.Context, stub protocolconnect.StreamServiceClient) (*connect.Response[GetStreamResponse], error) {
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
	// Validate input
	var app common.Address
	var appInfo *storage.AppInfo
	var err error
	if app, err = base.BytesToAddress(req.Msg.AppId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").Func("RegisterWebhook").
			Tag("app_id", req.Msg.AppId)
	}
	if appInfo, err = s.store.GetAppInfo(ctx, app); err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not determine app owner").
			Tag("app_id", app).Func("RegisterWebhook")
	}

	userId := authentication.UserFromAuthenticatedContext(ctx)
	if app != userId && appInfo.Owner != userId {
		return nil, base.RiverError(
			Err_PERMISSION_DENIED,
			"authenticated user must be either app or owner",
			"owner",
			appInfo.Owner,
			"app",
			app,
			"userId",
			userId,
		)
	}

	defaultEncryptionDevice, err := s.waitForAppEncryptionDevice(ctx, app)
	if err != nil {
		return nil, err
	}

	decryptedSecret, err := decryptSharedSecret(appInfo.EncryptedSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).
			Message("Unable to decrypt app shared secret from db").
			Tag("appId", app).Func("RegisterWebhook")
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
	s.statusCache.Delete(app.String())

	// Store the app record in pg
	if err := s.store.RegisterWebhook(ctx, app, webhook, defaultEncryptionDevice.DeviceKey, defaultEncryptionDevice.FallbackKey); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Func("RegisterWebhook")
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
	defer func() {
		if err != nil {
			err = base.AsRiverError(err, Err_INTERNAL).Func("GetStatus")
		}
	}()
	app, err := base.BytesToAddress(req.Msg.AppId)
	if err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").
			Tag("app_id", req.Msg.AppId)
	}

	// Check for cached status response
	if cached, ok := s.statusCache.Get(app.String()); ok {
		if status, ok := cached.(*AppServiceResponse_StatusResponse); ok {
			return &connect.Response[GetStatusResponse]{
				Msg: &GetStatusResponse{
					IsRegistered:  true,
					ValidResponse: true,
					Status:        status,
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

	decryptedSecret, err := decryptSharedSecret(appInfo.EncryptedSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).
			Message("Unable to decrypt app shared secret from db").
			Tag("appId", app)
	}

	status, err := s.appClient.GetWebhookStatus(ctx, appInfo.WebhookUrl, app, decryptedSecret)
	if err != nil {
		if base.IsRiverErrorCode(err, Err_MALFORMED_WEBHOOK_RESPONSE) {
			// App is registered but returned an invalid response
			return &connect.Response[GetStatusResponse]{
				Msg: &GetStatusResponse{
					IsRegistered: true,
				},
			}, nil
		} else {
			return nil, base.WrapRiverError(Err_INTERNAL, err).
				Message("Unable to call app webhook").
				Tag("app_id", app)
		}
	}

	s.statusCache.Set(app.String(), status, 0)

	return &connect.Response[GetStatusResponse]{
		Msg: &GetStatusResponse{
			IsRegistered:  true,
			ValidResponse: true,
			Status:        status,
		},
	}, nil
}
