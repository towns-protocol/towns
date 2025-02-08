package notifications

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/authentication"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/track_streams"

	"github.com/towns-protocol/towns/core/node/nodes"
	notificationssync "github.com/towns-protocol/towns/core/node/notifications/sync"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
)

const (
	notificationServiceChallengePrefix = "NS_AUTH:"
)

type (
	Service struct {
		authentication.AuthServiceMixin
		notificationsConfig config.NotificationsConfig
		onChainConfig       crypto.OnChainConfiguration
		userPreferences     UserPreferencesStore
		riverRegistry       *registries.RiverRegistryContract
		nodes               []nodes.NodeRegistry
		listener            notificationssync.StreamEventListener
		streamsTracker      track_streams.StreamsTracker
		metrics             infra.MetricsFactory
	}
)

func NewService(
	ctx context.Context,
	notificationsConfig config.NotificationsConfig,
	onChainConfig crypto.OnChainConfiguration,
	userPreferences UserPreferencesStore,
	riverRegistry *registries.RiverRegistryContract,
	nodes []nodes.NodeRegistry,
	metrics infra.MetricsFactory,
	listener notificationssync.StreamEventListener,
) (*Service, error) {
	tracker, err := notificationssync.NewStreamsTrackerForNotifications(
		ctx,
		onChainConfig,
		riverRegistry,
		nodes,
		listener,
		userPreferences,
		metrics,
	)
	if err != nil {
		return nil, err
	}

	service := &Service{
		notificationsConfig: notificationsConfig,
		onChainConfig:       onChainConfig,
		userPreferences:     userPreferences,
		riverRegistry:       riverRegistry,
		nodes:               nodes,
		listener:            listener,
		streamsTracker:      tracker,
		metrics:             metrics,
	}
	if err := service.AuthServiceMixin.InitAuthentication(
		notificationServiceChallengePrefix,
		&notificationsConfig.Authentication,
	); err != nil {
		return nil, err
	}

	return service, nil
}

func (s *Service) Start(ctx context.Context) {
	log := logging.FromCtx(ctx)

	go func() {
		for {
			log.Infow("Start notification streams tracker")

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

// GetSettings returns user stored notification userPreferencesCache.
func (s *Service) GetSettings(
	ctx context.Context,
	req *connect.Request[GetSettingsRequest],
) (*connect.Response[GetSettingsResponse], error) {
	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	preferences, err := s.userPreferences.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	resp := connect.NewResponse(&GetSettingsResponse{
		UserId:      preferences.UserID[:],
		Space:       preferences.Spaces.Protobuf(),
		DmGlobal:    preferences.DM,
		GdmGlobal:   preferences.GDM,
		DmChannels:  preferences.DMChannels.Protobuf(),
		GdmChannels: preferences.GDMChannels.Protobuf(),
	})

	for _, wp := range preferences.Subscriptions.WebPush {
		resp.Msg.WebSubscriptions = append(resp.Msg.WebSubscriptions, &WebPushSubscriptionObject{
			Endpoint: wp.Sub.Endpoint,
			Keys: &WebPushSubscriptionObjectKeys{
				P256Dh: wp.Sub.Keys.P256dh,
				Auth:   wp.Sub.Keys.Auth,
			},
		})
	}

	for _, apn := range preferences.Subscriptions.APNPush {
		resp.Msg.ApnSubscriptions = append(resp.Msg.ApnSubscriptions, &APNSubscription{
			DeviceToken: apn.DeviceToken,
			Environment: apn.Environment,
		})
	}

	return resp, nil
}

// SetSettings sets the notification userPreferencesCache, overwriting any existing userPreferencesCache.
func (s *Service) SetSettings(
	ctx context.Context,
	req *connect.Request[SetSettingsRequest],
) (*connect.Response[SetSettingsResponse], error) {
	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	preferences, err := types.DecodeUserPreferenceFromMsg(userID, req.Msg)
	if err != nil {
		return nil, err
	}

	if err := s.userPreferences.SetUserPreferences(ctx, preferences); err != nil {
		return nil, AsRiverError(err).Func("SetSettings").
			Tag("userID", preferences.UserID)
	}

	return connect.NewResponse(&SetSettingsResponse{}), nil
}

func (s *Service) SetDmGdmSettings(
	ctx context.Context,
	req *connect.Request[SetDmGdmSettingsRequest],
) (*connect.Response[SetDmGdmSettingsResponse], error) {
	var (
		msg = req.Msg
		dm  = msg.GetDmGlobal()
		gdm = msg.GetGdmGlobal()
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	err := s.userPreferences.SetGlobalDmGdm(ctx, userID, dm, gdm)
	if err != nil {
		return nil, AsRiverError(err).Func("SetDmGdmSettings")
	}

	return connect.NewResponse(&SetDmGdmSettingsResponse{}), nil
}

func (s *Service) SetSpaceSettings(
	ctx context.Context,
	req *connect.Request[SetSpaceSettingsRequest],
) (*connect.Response[SetSpaceSettingsResponse], error) {
	var (
		msg          = req.Msg
		spaceID, err = shared.StreamIdFromBytes(msg.GetSpaceId())
		value        = msg.GetValue()
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if err != nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid spaceId").
			Func("SetSpaceSettings")
	}

	err = s.userPreferences.SetSpaceSettings(ctx, userID, spaceID, value)
	if err != nil {
		return nil, AsRiverError(err).Func("SetSpaceSettings")
	}

	return connect.NewResponse(&SetSpaceSettingsResponse{}), nil
}

func (s *Service) SetDmChannelSetting(
	ctx context.Context,
	req *connect.Request[SetDmChannelSettingRequest],
) (*connect.Response[SetDmChannelSettingResponse], error) {
	var (
		msg   = req.Msg
		value = msg.GetValue()
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	channelID, err := shared.StreamIdFromBytes(msg.GetDmChannelId())
	if err != nil {
		return nil, AsRiverError(err).Func("SetDmChannelSetting")
	}

	if channelID.Type() != shared.STREAM_DM_CHANNEL_BIN {
		return nil, RiverError(Err_INVALID_ARGUMENT, "channel must be a DM channel").
			Func("SetGdmChannelSetting")
	}

	if err := s.userPreferences.SetDMChannelSetting(ctx, userID, channelID, value); err != nil {
		return nil, AsRiverError(err).Func("SetDMChannelSetting")
	}

	return connect.NewResponse(&SetDmChannelSettingResponse{}), nil
}

func (s *Service) SetGdmChannelSetting(
	ctx context.Context,
	req *connect.Request[SetGdmChannelSettingRequest],
) (*connect.Response[SetGdmChannelSettingResponse], error) {
	var (
		msg   = req.Msg
		value = msg.GetValue()
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	channelID, err := shared.StreamIdFromBytes(msg.GetGdmChannelId())
	if err != nil {
		return nil, AsRiverError(err).Func("SetGdmChannelSetting")
	}

	if channelID.Type() != shared.STREAM_GDM_CHANNEL_BIN {
		return nil, RiverError(Err_INVALID_ARGUMENT, "channel must be a GDM channel").
			Func("SetGDMChannelSetting")
	}

	if err := s.userPreferences.SetGDMChannelSetting(ctx, userID, channelID, value); err != nil {
		return nil, AsRiverError(err).Func("SetDMChannelSetting")
	}

	return connect.NewResponse(&SetGdmChannelSettingResponse{}), nil
}

func (s *Service) SetSpaceChannelSettings(
	ctx context.Context,
	req *connect.Request[SetSpaceChannelSettingsRequest],
) (*connect.Response[SetSpaceChannelSettingsResponse], error) {
	var (
		msg   = req.Msg
		value = msg.GetValue()
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	channelID, err := shared.StreamIdFromBytes(msg.GetChannelId())
	if err != nil {
		return nil, AsRiverError(err).Func("SetSpaceChannelSettings")
	}

	if err := s.userPreferences.SetChannelSetting(ctx, userID, channelID, value); err != nil {
		return nil, AsRiverError(err).Func("SetChannelSettings")
	}

	return connect.NewResponse(&SetSpaceChannelSettingsResponse{}), nil
}

func (s *Service) SubscribeWebPush(
	ctx context.Context,
	req *connect.Request[SubscribeWebPushRequest],
) (*connect.Response[SubscribeWebPushResponse], error) {
	var (
		msg          = req.Msg
		subscription = msg.GetSubscription()
		keys         = subscription.GetKeys()
		webPushSub   = &webpush.Subscription{
			Endpoint: subscription.GetEndpoint(),
			Keys: webpush.Keys{
				Auth:   keys.GetAuth(),
				P256dh: keys.GetP256Dh(),
			},
		}
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if err := s.userPreferences.AddWebPushSubscription(ctx, userID, webPushSub); err != nil {
		return nil, err
	}

	return connect.NewResponse(&SubscribeWebPushResponse{}), nil
}

func (s *Service) UnsubscribeWebPush(
	ctx context.Context,
	req *connect.Request[UnsubscribeWebPushRequest],
) (*connect.Response[UnsubscribeWebPushResponse], error) {
	var (
		msg          = req.Msg
		subscription = msg.GetSubscription()
		keys         = subscription.GetKeys()
		webPushSub   = &webpush.Subscription{
			Endpoint: subscription.GetEndpoint(),
			Keys: webpush.Keys{
				Auth:   keys.GetAuth(),
				P256dh: keys.GetP256Dh(),
			},
		}
	)

	userID := authentication.UserFromAuthenticatedContext(ctx)
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if err := s.userPreferences.RemoveWebPushSubscription(ctx, userID, webPushSub); err != nil {
		return nil, err
	}

	return connect.NewResponse(&UnsubscribeWebPushResponse{}), nil
}

func (s *Service) SubscribeAPN(
	ctx context.Context,
	req *connect.Request[SubscribeAPNRequest],
) (*connect.Response[SubscribeAPNResponse], error) {
	var (
		msg         = req.Msg
		userID      = authentication.UserFromAuthenticatedContext(ctx)
		deviceToken = msg.GetDeviceToken()
		environment = msg.GetEnvironment()
		pushVersion = msg.GetPushVersion()
	)

	if len(deviceToken) == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid APN device token")
	}
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	if pushVersion == NotificationPushVersion_NOTIFICATION_PUSH_VERSION_UNSPECIFIED {
		pushVersion = NotificationPushVersion_NOTIFICATION_PUSH_VERSION_1
	}

	if err := s.userPreferences.AddAPNSubscription(ctx, userID, deviceToken, environment, pushVersion); err != nil {
		return nil, err
	}

	return connect.NewResponse(&SubscribeAPNResponse{}), nil
}

func (s *Service) UnsubscribeAPN(
	ctx context.Context,
	req *connect.Request[UnsubscribeAPNRequest],
) (*connect.Response[UnsubscribeAPNResponse], error) {
	var (
		msg         = req.Msg
		deviceToken = msg.GetDeviceToken()
		userID      = authentication.UserFromAuthenticatedContext(ctx)
	)
	if len(deviceToken) == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid APN device token")
	}
	if userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "Invalid user id")
	}

	logging.FromCtx(ctx).Infow("remove APN subscription", "userID", userID)

	if err := s.userPreferences.RemoveAPNSubscription(ctx, deviceToken, userID); err != nil {
		return nil, err
	}

	return connect.NewResponse(&UnsubscribeAPNResponse{}), nil
}
