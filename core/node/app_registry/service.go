package app_registry

import (
	"context"
	"encoding/hex"
	"net/http"
	"time"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/app_registry/sync"
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
	httpClient *http.Client,
) (*Service, error) {
	if len(nodes) < 1 {
		return nil, base.RiverError(
			Err_INVALID_ARGUMENT,
			"App registry service initialized with insufficient node registries",
		)
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
	appClient := app_client.NewAppClient(httpClient, cfg.AllowInsecureWebhooks)
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
	}

	if err := s.InitAuthentication(appServiceChallengePrefix, &cfg.Authentication); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Service) Start(ctx context.Context) {
	log := logging.FromCtx(ctx).With("func", "AppRegistryService.Start")

	go func() {
		for {
			log.Infow("Start app registry streams tracker")

			if err := s.streamsTracker.Run(ctx); err != nil {
				log.Errorw("tracking streams failed", "err", err)
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
			Tag("app_id", req.Msg.AppId)
	}

	if owner, err = base.BytesToAddress(req.Msg.AppOwnerId); err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid owner id").
			Tag("owner_id", req.Msg.AppOwnerId)
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

	if err := s.store.CreateApp(ctx, owner, app, encrypted); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).Message("Error creating app in database")
	}

	if err := s.streamsTracker.AddStream(shared.UserInboxStreamIdFromAddress(app)); err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL).
			Message("Error subscribing to app's user inbox stream to watch for keys")
	}

	return &connect.Response[RegisterResponse]{
		Msg: &RegisterResponse{
			Hs256SharedSecret: appSecret[:],
		},
	}, nil
}

// waitForAppEncryption device waits up to 10 seconds for the app's user metadata stream to become
// available, first in the registry, and then on one of the peer nodes that host it. Once the stream
// is available, it looks for the first encryption device in the stream and returns it. The stream
// is expected to have exactly 1 encryption device if it is available.
func (s *Service) waitForAppEncryptionDevice(
	ctx context.Context,
	appId common.Address,
) (*storage.EncryptionDevice, error) {
	log := logging.FromCtx(ctx).With("func", "AppRegistryService.waitForEncryptionDevice")
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
			stream, err := s.riverRegistry.StreamRegistry.GetStream(nil, userMetadataStreamId)
			if err != nil {
				continue
			}
			nodes := nodes.NewStreamNodesWithLock(stream.Nodes, common.Address{})
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
			view, loopExitErr = events.MakeRemoteStreamView(ctx, streamResponse.Msg.Stream)
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
			Message("invalid app id").
			Tag("app_id", req.Msg.AppId)
	}
	if appInfo, err = s.store.GetAppInfo(ctx, app); err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).Message("could not determine app owner").
			Tag("app_id", app)
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
			Tag("appId", app)
	}

	webhook := req.Msg.WebhookUrl
	serverEncryptionDevice, err := s.appClient.InitializeWebhook(
		ctx,
		app,
		decryptedSecret,
		webhook,
	)
	if err != nil {
		return nil, base.WrapRiverError(Err_UNKNOWN, err).Message("Unable to initialize app service")
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
			Tag("responseFallbackKey", serverEncryptionDevice.FallbackKey)
	}

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
	*connect.Response[GetStatusResponse],
	error,
) {
	app, err := base.BytesToAddress(req.Msg.AppId)
	if err != nil {
		return nil, base.WrapRiverError(Err_INVALID_ARGUMENT, err).
			Message("invalid app id").
			Tag("app_id", req.Msg.AppId).
			Func("GetStatus")
	}

	// TODO: implement 2 second caching here as a security measure against
	// DoS attacks.
	if _, err = s.store.GetAppInfo(ctx, app); err != nil {
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
				Tag("app_id", app).
				Func("GetStatus")
		}
	}

	// TODO: issue request to app service, confirm 200 response, and
	// validate returned version info. Return in the response.
	return &connect.Response[GetStatusResponse]{
		Msg: &GetStatusResponse{
			IsRegistered: true,
		},
	}, nil
}
