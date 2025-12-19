package notifications

import (
	"bytes"
	"context"
	"errors"
	"sync"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type (
	// UserPreferencesStore extends the storage.NotificationStore that keeps data in persistent store with
	// operations that use in memory data.
	UserPreferencesStore interface {
		storage.NotificationStore

		BlockUser(
			userID common.Address,
			user common.Address,
		)

		UnblockUser(
			userID common.Address,
			user common.Address,
		)

		IsBlocked(
			userID common.Address,
			user common.Address,
		) bool
	}

	// UserPreferencesCache provides access to notification related userPreferencesCache a user has set.
	// It implements storage.NotificationStore and wraps a persistent datastore and build up an in-memory
	// userPreferencesCache
	// for fast retrieval. It uses a lazy-loading strategy where userPreferencesCache are only retrieved from persistent
	// userPreferences when needed. Because reads are likely to happen much more frequently than writes it uses copy on
	// write
	// allowing for parallel reads.
	UserPreferencesCache struct {
		persistent storage.NotificationStore
		// userPreferencesCache stores an in-memory userPreferencesCache of user userPreferencesCache
		// mapping from userID (common.Address) -> *types.UserPreferences
		userPreferencesCache sync.Map
		// blockedUsersCache keeps track of the list of users someone has blocked
		// mapping from userID -> *blockedUserList
		blockedUsersCache sync.Map
	}

	blockedUserList struct {
		mu    sync.RWMutex
		users mapset.Set[common.Address]
	}
)

var SubscriptionTimeout = 5 * time.Minute

var _ UserPreferencesStore = (*UserPreferencesCache)(nil)

// NewUserPreferencesCache instantiates a new UserPreferencesCachedStore instance.
// UserPreferencesCachedStore implements UserPreferencesStore.
func NewUserPreferencesCache(persistent storage.NotificationStore) *UserPreferencesCache {
	return &UserPreferencesCache{persistent: persistent}
}

func (up *UserPreferencesCache) GetUserPreferences(
	ctx context.Context,
	userID common.Address,
) (*types.UserPreferences, error) {
	cached, found := up.userPreferencesCache.Load(userID)
	if found {
		return cached.(*types.UserPreferences), nil
	}

	preferences, err := up.persistent.GetUserPreferences(ctx, userID)
	if err != nil {
		var riverErr *base.RiverErrorImpl
		if errors.As(err, &riverErr) && riverErr.Code == Err_NOT_FOUND {
			// load default user preferences config
			return up.def(userID), nil
		}

		return nil, err
	}

	up.userPreferencesCache.Store(userID, preferences)

	return preferences, nil
}

func (up *UserPreferencesCache) def(userID common.Address) *types.UserPreferences {
	return &types.UserPreferences{
		UserID:      userID,
		DM:          DmChannelSettingValue_DM_MESSAGES_YES,
		GDM:         GdmChannelSettingValue_GDM_ONLY_MENTIONS_REPLIES_REACTIONS,
		Spaces:      make(types.SpacesMap),
		DMChannels:  make(types.DMChannelsMap),
		GDMChannels: make(types.GDMChannelsMap),
	}
}

func (up *UserPreferencesCache) SetUserPreferences(
	ctx context.Context,
	preferences *types.UserPreferences,
) error {
	if err := up.persistent.SetUserPreferences(ctx, preferences); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(preferences.UserID)

	return nil
}

func (up *UserPreferencesCache) SetDMChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value DmChannelSettingValue,
) error {
	if err := up.persistent.SetDMChannelSetting(ctx, userID, channelID, value); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) SetGDMChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value GdmChannelSettingValue,
) error {
	if err := up.persistent.SetGDMChannelSetting(ctx, userID, channelID, value); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) SetGlobalDmGdm(
	ctx context.Context,
	userID common.Address,
	dm DmChannelSettingValue,
	gdm GdmChannelSettingValue,
) error {
	if err := up.persistent.SetGlobalDmGdm(ctx, userID, dm, gdm); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) SetSpaceSettings(
	ctx context.Context,
	userID common.Address,
	spaceID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	if err := up.persistent.SetSpaceSettings(ctx, userID, spaceID, value); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) RemoveSpaceSettings(
	ctx context.Context,
	userID common.Address,
	spaceID shared.StreamId,
) error {
	if err := up.persistent.RemoveSpaceSettings(ctx, userID, spaceID); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) RemoveChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
) error {
	if err := up.persistent.RemoveChannelSetting(ctx, userID, channelID); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) SetChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	if err := up.persistent.SetChannelSetting(ctx, userID, channelID, value); err != nil {
		return err
	}

	// force a reload next time user preferences are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) BlockUser(userID common.Address, user common.Address) {
	ms := &blockedUserList{
		mu:    sync.RWMutex{},
		users: mapset.NewSet[common.Address](),
	}

	cache, _ := up.blockedUsersCache.LoadOrStore(userID, ms)

	list := cache.(*blockedUserList)
	list.mu.Lock()
	list.users.Add(user)
	list.mu.Unlock()
}

func (up *UserPreferencesCache) UnblockUser(userID common.Address, user common.Address) {
	ms := &blockedUserList{
		mu:    sync.RWMutex{},
		users: mapset.NewSet[common.Address](),
	}

	cache, _ := up.blockedUsersCache.LoadOrStore(userID, ms)

	list := cache.(*blockedUserList)
	list.mu.Lock()
	list.users.Remove(user)
	list.mu.Unlock()
}

func (up *UserPreferencesCache) IsBlocked(userID common.Address, user common.Address) bool {
	cache, found := up.blockedUsersCache.Load(userID)
	if !found {
		return false
	}

	list := cache.(*blockedUserList)
	list.mu.Lock()
	blocked := list.users.Contains(user)
	list.mu.Unlock()

	return blocked
}

func (up *UserPreferencesCache) GetWebPushSubscriptions(
	ctx context.Context,
	userID common.Address,
) ([]*types.WebPushSubscription, error) {
	pref, err := up.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	return pref.Subscriptions.WebPush, nil
}

// AddWebPushSubscription does an upsert for the given userID and webPushSubscription.
// This is an upsert because a browser can be shared among multiple users and the active userID needs to
// be correlated with the web push sub.
func (up *UserPreferencesCache) AddWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
	app string,
) error {
	pref, err := up.GetUserPreferences(ctx, userID)
	if err != nil {
		return err
	}

	// if nothing has changed and last seen was recently don't update the DB.
	// this method is expected to be called often by the client.
	for _, sub := range pref.Subscriptions.WebPush {
		if sub.Sub.Keys == webPushSubscription.Keys &&
			sub.Sub.Endpoint == webPushSubscription.Endpoint &&
			time.Since(sub.LastSeen) < SubscriptionTimeout {
			return nil
		}
	}

	err = up.persistent.AddWebPushSubscription(ctx, userID, webPushSubscription, app)
	if err != nil {
		return err
	}

	// force reload next time user userPreferencesCache are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) RemoveExpiredWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
	app string,
) error {
	err := up.persistent.RemoveExpiredWebPushSubscription(ctx, userID, webPushSubscription, app)
	if err != nil {
		return err
	}

	// force reload next time user userPreferencesCache are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

// RemoveWebPushSubscription deleted a web push subscription.
func (up *UserPreferencesCache) RemoveWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
) error {
	err := up.persistent.RemoveWebPushSubscription(ctx, userID, webPushSubscription)
	if err != nil {
		return err
	}

	// force reload next time user userPreferencesCache are requested
	up.userPreferencesCache.Delete(userID)

	return nil
}

func (up *UserPreferencesCache) GetAPNSubscriptions(
	ctx context.Context,
	userID common.Address,
) ([]*types.APNPushSubscription, error) {
	pref, err := up.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	return pref.Subscriptions.APNPush, nil
}

func (up *UserPreferencesCache) AddAPNSubscription(
	ctx context.Context,
	userID common.Address,
	deviceToken []byte,
	environment APNEnvironment,
	pushVersion NotificationPushVersion,
	app string,
) error {
	pref, err := up.GetUserPreferences(ctx, userID)
	if err != nil {
		return err
	}

	// if it already exists and last seen was recently no need to update the database.
	// this method is expected to be called often by the client.
	for _, apnPush := range pref.Subscriptions.APNPush {
		if bytes.Equal(apnPush.DeviceToken, deviceToken) && time.Since(apnPush.LastSeen) < SubscriptionTimeout {
			return nil
		}
	}

	err = up.persistent.AddAPNSubscription(ctx, userID, deviceToken, environment, pushVersion, app)
	if err != nil {
		return err
	}

	// force reload next time user userPreferencesCache are requested
	up.userPreferencesCache.Delete(userID)

	return err
}

func (up *UserPreferencesCache) RemoveAPNSubscription(ctx context.Context,
	deviceToken []byte,
	userID common.Address,
) error {
	err := up.persistent.RemoveAPNSubscription(ctx, deviceToken, userID)
	if err != nil {
		return err
	}

	// force reload next time user userPreferencesCache are requested
	up.userPreferencesCache.Delete(userID)

	return err
}
