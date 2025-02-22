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
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

const (
	appServiceChallengePrefix = "AS_AUTH:"
)

type (
	Service struct {
		authentication.AuthServiceMixin
		cfg                           config.AppRegistryConfig
		store                         storage.AppRegistryStore
		streamsTracker                track_streams.StreamsTracker
		sharedSecretDataEncryptionKey [32]byte
		appClient                     *app_client.AppClient
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
	tracker, err := sync.NewAppRegistryStreamsTracker(
		ctx,
		cfg,
		onChainConfig,
		riverRegistry,
		nodes,
		metrics,
		listener,
	)
	if err != nil {
		return nil, err
	}

	sharedSecretDataEncryptionKey, err := hex.DecodeString(cfg.SharedSecretDataEncryptionKey)
	if err != nil || len(sharedSecretDataEncryptionKey) != 32 {
		return nil, base.AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("AppRegistryConfig SharedSecretDataEncryptionKey must be a 32-byte key encoded as hex")
	}

	s := &Service{
		cfg:                           cfg,
		store:                         store,
		streamsTracker:                tracker,
		sharedSecretDataEncryptionKey: [32]byte(sharedSecretDataEncryptionKey),
		appClient:                     app_client.NewAppClient(httpClient, cfg.AllowLoopbackWebhooks),
	}

	if err := s.InitAuthentication(appServiceChallengePrefix, &cfg.Authentication); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Service) Start(ctx context.Context) {
	log := logging.FromCtx(ctx)

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
		return nil, base.AsRiverError(err, Err_INTERNAL).Func("Register")
	}

	return &connect.Response[RegisterResponse]{
		Msg: &RegisterResponse{
			Hs256SharedSecret: appSecret[:],
		},
	}, nil
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

	// TODO:
	// timeout of up to 10s to support UX flow where app user stream is just created.
	// From the user stream, extract the device id and fallback key. Validate that it
	// matches what is returned by the webhook when we send an initialize request to it.

	// TODO: Validate URL
	// - https only
	// - no private ips or loopback directly quoted in the webhook url, as these are def.
	// invalid
	// - no redirect params allowed in the url either
	webhook := req.Msg.WebhookUrl

	decryptedSecret, err := decryptSharedSecret(appInfo.EncryptedSecret, s.sharedSecretDataEncryptionKey)
	if err != nil {
		return nil, base.WrapRiverError(Err_INTERNAL, err).
			Message("Unable to decrypt app shared secret from db").
			Tag("appId", app)
	}

	if err := s.appClient.InitializeWebhook(
		ctx,
		webhook,
		app,
		decryptedSecret,
	); err != nil {
		return nil, base.WrapRiverError(Err_UNKNOWN, err).Message("Unable to initialize app service")
	}

	// Store the app record in pg
	if err := s.store.RegisterWebhook(ctx, app, webhook); err != nil {
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
