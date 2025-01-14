package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/notifications/types"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

type (
	PostgresNotificationStore struct {
		PostgresEventStore

		exitSignal chan error
	}

	NotificationStore interface {
		GetUserPreferences(
			ctx context.Context,
			userID common.Address,
		) (*types.UserPreferences, error)

		SetUserPreferences(
			ctx context.Context,
			preferences *types.UserPreferences,
		) error

		SetGlobalDmGdm(
			ctx context.Context,
			userID common.Address,
			dm DmChannelSettingValue,
			gdm GdmChannelSettingValue,
		) error

		SetSpaceSettings(
			ctx context.Context,
			userID common.Address,
			spaceID shared.StreamId,
			value SpaceChannelSettingValue,
		) error

		RemoveSpaceSettings(
			ctx context.Context,
			userID common.Address,
			spaceID shared.StreamId,
		) error

		SetDMChannelSetting(
			ctx context.Context,
			userID common.Address,
			channelID shared.StreamId,
			value DmChannelSettingValue,
		) error

		SetGDMChannelSetting(
			ctx context.Context,
			userID common.Address,
			channelID shared.StreamId,
			value GdmChannelSettingValue,
		) error

		SetChannelSetting(
			ctx context.Context,
			userID common.Address,
			channelID shared.StreamId,
			value SpaceChannelSettingValue,
		) error

		RemoveChannelSetting(
			ctx context.Context,
			userID common.Address,
			channelID shared.StreamId,
		) error

		GetWebPushSubscriptions(
			ctx context.Context,
			userID common.Address,
		) ([]*types.WebPushSubscription, error)

		// AddWebPushSubscription does an upsert for the given userID and webPushSubscription.
		// This is an upsert because a browser can be shared among multiple users and the active userID needs to
		// be correlated with the web push sub.
		AddWebPushSubscription(
			ctx context.Context,
			userID common.Address,
			webPushSubscription *webpush.Subscription,
		) error

		// RemoveExpiredWebPushSubscription deletes a web push subscription with an expired endpoint.
		RemoveExpiredWebPushSubscription(
			ctx context.Context,
			userID common.Address,
			webPushSubscription *webpush.Subscription,
		) error

		// RemoveWebPushSubscription deletes a web push subscription.
		RemoveWebPushSubscription(
			ctx context.Context,
			userID common.Address,
			webPushSubscription *webpush.Subscription,
		) error

		GetAPNSubscriptions(
			ctx context.Context,
			userID common.Address,
		) ([]*types.APNPushSubscription, error)

		AddAPNSubscription(
			ctx context.Context,
			userID common.Address,
			deviceToken []byte,
			environment APNEnvironment,
			pushVersion NotificationPushVersion,
		) error

		RemoveAPNSubscription(ctx context.Context,
			deviceToken []byte,
			userID common.Address,
		) error
	}
)

var _ NotificationStore = (*PostgresNotificationStore)(nil)

//go:embed notification_migrations/*.sql
var notificationMigrationsDir embed.FS

func DbSchemaNameForNotifications(riverChainID uint64) string {
	return fmt.Sprintf("n_%d", riverChainID)
}

// NewPostgresNotificationStore instantiates a new PostgreSQL persistent storage for the notification service.
func NewPostgresNotificationStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresNotificationStore, error) {
	store := &PostgresNotificationStore{
		exitSignal: exitSignal,
	}

	if err := store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&notificationMigrationsDir,
		"notification_migrations",
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresNotificationStore")
	}

	if err := store.initStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresNotificationStore")
	}

	return store, nil
}

// Close removes instance record from singlenodekey table, releases the listener connection, and
// closes the postgres connection pool
func (s *PostgresNotificationStore) Close(ctx context.Context) {
	s.PostgresEventStore.Close(ctx)
}

func (s *PostgresNotificationStore) SetUserPreferences(
	ctx context.Context,
	preferences *types.UserPreferences,
) error {
	return s.txRunner(
		ctx,
		"SetUserPreferences",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setUserPreferencesTx(ctx, tx, preferences)
		},
		nil,
		"userID", preferences.UserID,
	)
}

func (s *PostgresNotificationStore) setUserPreferencesTx(
	ctx context.Context,
	tx pgx.Tx,
	preferences *types.UserPreferences,
) error {
	batch := &pgx.Batch{}

	userID := hex.EncodeToString(preferences.UserID[:])

	batch.Queue(`DELETE FROM spaces WHERE user_id = $1`, userID)
	batch.Queue(`DELETE FROM channels WHERE user_id = $1`, userID)

	batch.Queue(
		`INSERT INTO userpreferences (user_id, dm, gdm) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET dm = $2, gdm = $3`,
		userID,
		int16(preferences.DM),
		int16(preferences.GDM),
	)

	for spaceID, space := range preferences.Spaces {
		batch.Queue(
			`INSERT INTO spaces (user_id, space_id, setting) VALUES ($1,$2,$3)`,
			userID,
			spaceID,
			int16(space.Setting),
		)
		for channelID, pref := range space.Channels {
			batch.Queue(
				`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1,$2,$3)`,
				userID,
				channelID,
				int16(pref),
			)
		}
	}

	for channelID, pref := range preferences.DMChannels {
		batch.Queue(
			`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1,$2,$3)`,
			userID,
			channelID,
			int16(pref),
		)
	}

	for channelID, pref := range preferences.GDMChannels {
		batch.Queue(
			`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1,$2,$3)`,
			userID,
			channelID,
			int16(pref),
		)
	}

	br := tx.SendBatch(ctx, batch)

	_, _ = br.Exec()
	err := br.Close()
	if err != nil {
		return err // returns the cause why br.Exec failed
	}

	return nil
}

func (s *PostgresNotificationStore) SetGlobalDmGdm(
	ctx context.Context,
	userID common.Address,
	dm DmChannelSettingValue,
	gdm GdmChannelSettingValue,
) error {
	return s.txRunner(
		ctx,
		"SetGlobalDmGdm",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setGlobalDmGdmTx(ctx, tx, userID, dm, gdm)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) setGlobalDmGdmTx(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	dm DmChannelSettingValue,
	gdm GdmChannelSettingValue,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO userpreferences (user_id, dm, gdm) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET dm=$2, gdm = $3`,
		hex.EncodeToString(userID[:]),
		int16(dm),
		int16(gdm),
	)

	return err
}

func (s *PostgresNotificationStore) SetSpaceSettings(
	ctx context.Context,
	userID common.Address,
	spaceID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	return s.txRunner(
		ctx,
		"SetSpaceSettings",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setSpaceSettingsTx(ctx, tx, userID, spaceID, value)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) setSpaceSettingsTx(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	spaceID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO spaces (user_id, space_id, setting) VALUES ($1, $2, $3) ON CONFLICT (user_id, space_id) DO UPDATE SET setting = $3`,
		hex.EncodeToString(userID[:]),
		spaceID,
		int16(value),
	)

	return err
}

func (s *PostgresNotificationStore) RemoveSpaceSettings(
	ctx context.Context,
	userID common.Address,
	spaceID shared.StreamId,
) error {
	return s.txRunner(
		ctx,
		"RemoveSpaceSettings",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.removeSpaceSettings(ctx, tx, userID, spaceID)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) removeSpaceSettings(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	spaceID shared.StreamId,
) error {
	_, err := tx.Exec(
		ctx,
		`DELETE from spaces WHERE user_id = $1 AND space_id = $2`,
		hex.EncodeToString(userID[:]),
		spaceID,
	)

	return err
}

func (s *PostgresNotificationStore) SetChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	if value == SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_UNSPECIFIED {
		return s.RemoveChannelSetting(ctx, userID, channelID)
	}
	return s.txRunner(
		ctx,
		"SetChannelSetting",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setChannelSettingTx(ctx, tx, userID, channelID, value)
		},
		nil,
		"userID", userID,
		"channel", channelID,
	)
}

func (s *PostgresNotificationStore) setChannelSettingTx(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	channelID shared.StreamId,
	value SpaceChannelSettingValue,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1, $2, $3) ON CONFLICT (user_id, channel_id) DO UPDATE SET setting = $3`,
		hex.EncodeToString(userID[:]),
		channelID,
		int16(value),
	)

	return err
}

func (s *PostgresNotificationStore) RemoveChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
) error {
	return s.txRunner(
		ctx,
		"RemoveChannelSetting",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.removeChannelSettingTx(ctx, tx, userID, channelID)
		},
		nil,
		"userID", userID,
		"channel", channelID,
	)
}

func (s *PostgresNotificationStore) removeChannelSettingTx(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	channelID shared.StreamId,
) error {
	_, err := tx.Exec(
		ctx,
		`DELETE FROM channels WHERE user_id = $1 AND channel_id = $2`,
		hex.EncodeToString(userID[:]),
		channelID,
	)

	return err
}

func (s *PostgresNotificationStore) GetUserPreferences(
	ctx context.Context,
	userID common.Address,
) (*types.UserPreferences, error) {
	var result *types.UserPreferences

	err := s.txRunner(
		ctx,
		"GetUserPreferences",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			pref, err := s.getUserPreferencesTx(ctx, tx, userID)
			if err != nil {
				return err
			}
			result = pref
			return nil
		},
		nil,
	)
	if err != nil {
		return nil, err
	}

	if result == nil {
		return nil, RiverError(Err_NOT_FOUND, "User settings not found").Tag("user", userID)
	}

	return result, nil
}

func (s *PostgresNotificationStore) getUserPreferencesTx(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
) (*types.UserPreferences, error) {
	userPref := &types.UserPreferences{
		UserID:      userID,
		Spaces:      make(types.SpacesMap),
		DMChannels:  make(types.DMChannelsMap),
		GDMChannels: make(types.GDMChannelsMap),
	}

	userIDStr := hex.EncodeToString(userID[:])

	row := tx.QueryRow(ctx, "SELECT dm, gdm FROM userpreferences where user_id = $1", userIDStr)

	err := row.Scan(&userPref.DM, &userPref.GDM)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			userPref.DM = DmChannelSettingValue_DM_MESSAGES_YES    // default
			userPref.GDM = GdmChannelSettingValue_GDM_MESSAGES_ALL // default
		} else {
			return nil, err
		}
	}

	spaceRows, err := tx.Query(
		ctx,
		`SELECT space_id, setting FROM spaces where user_id = $1`,
		userIDStr,
	)
	if err != nil {
		return nil, err
	}
	defer spaceRows.Close()

	for spaceRows.Next() {
		var spaceID shared.StreamId
		space := &types.SpacePreferences{
			Setting:  SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS,
			Channels: make(types.SpaceChannelsMap),
		}

		if err := spaceRows.Scan(&spaceID, &space.Setting); err != nil {
			return nil, err
		}

		userPref.Spaces[spaceID] = space
	}

	channelRows, err := tx.Query(
		ctx,
		`SELECT channel_id, setting FROM channels where user_id = $1`,
		userIDStr,
	)
	if err != nil {
		return nil, err
	}
	defer channelRows.Close()

	for channelRows.Next() {
		var (
			channelIDRaw []byte
			setting      SpaceChannelSettingValue
		)

		if err := channelRows.Scan(&channelIDRaw, &setting); err != nil {
			return nil, err
		}

		channelID, _ := shared.StreamIdFromString(string(channelIDRaw))

		if channelID.Type() == shared.STREAM_CHANNEL_BIN {
			spaceID := channelID.SpaceID()
			space, found := userPref.Spaces[spaceID]
			if !found {
				space = &types.SpacePreferences{
					Setting:  SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS,
					Channels: make(types.SpaceChannelsMap),
				}
				userPref.Spaces[spaceID] = space
			}
			space.Channels[channelID] = setting
		} else if channelID.Type() == shared.STREAM_DM_CHANNEL_BIN {
			userPref.DMChannels[channelID] = DmChannelSettingValue(setting)
		} else if channelID.Type() == shared.STREAM_GDM_CHANNEL_BIN {
			userPref.GDMChannels[channelID] = GdmChannelSettingValue(setting)
		}
	}

	userPref.Subscriptions.APNPush, err = s.getAPNSubscriptions(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	userPref.Subscriptions.WebPush, err = s.getWebPushSubscriptions(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	return userPref, nil
}

func (s *PostgresNotificationStore) GetWebPushSubscriptions(
	ctx context.Context,
	userID common.Address,
) ([]*types.WebPushSubscription, error) {
	var (
		err  error
		subs []*types.WebPushSubscription
	)

	err = s.txRunner(
		ctx,
		"GetWebPushSubscriptions",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			subs, err = s.getWebPushSubscriptions(ctx, tx, userID)
			return err
		},
		nil,
	)

	return subs, err
}

func (s *PostgresNotificationStore) getWebPushSubscriptions(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
) ([]*types.WebPushSubscription, error) {
	var subs []*types.WebPushSubscription
	rows, err := tx.Query(
		ctx,
		"select key_auth, key_p256dh, endpoint, last_seen from webpushsubscriptions where user_id=$1",
		hex.EncodeToString(userID[:]),
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return subs, nil
		}
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var sub webpush.Subscription
		var lastSeen time.Time
		err = rows.Scan(&sub.Keys.Auth, &sub.Keys.P256dh, &sub.Endpoint, &lastSeen)
		if err != nil {
			return nil, err
		}

		subs = append(subs, &types.WebPushSubscription{
			Sub:      &sub,
			LastSeen: lastSeen,
		})
	}

	return subs, nil
}

// AddWebPushSubscription does an upsert for the given userID and webPushSubscription.
// This is an upsert because a browser can be shared among multiple users and the active userID needs to
// be correlated with the web push sub.
func (s *PostgresNotificationStore) AddWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
) error {
	return s.txRunner(
		ctx,
		"AddWebPushSubscription",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.addWebPushSubscription(ctx, tx, userID, webPushSubscription)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) addWebPushSubscription(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO webpushsubscriptions (key_auth, key_p256dh, endpoint, user_id, last_seen) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (key_auth, key_p256dh) DO UPDATE SET endpoint=$3, user_id = $4, last_seen = NOW()`,
		webPushSubscription.Keys.Auth,
		webPushSubscription.Keys.P256dh,
		webPushSubscription.Endpoint,
		hex.EncodeToString(userID[:]),
	)

	return err
}

// RemoveExpiredWebPushSubscription deleted an expired web push subscription.
// This ensures that the record is only deleted when it was not changed to
// prevent a race condition when the user refreshed the subscription.
func (s *PostgresNotificationStore) RemoveExpiredWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
) error {
	return s.txRunner(
		ctx,
		"RemoveExpiredWebPushSubscription",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.removeExpiredWebPushSubscription(ctx, tx, webPushSubscription)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) removeExpiredWebPushSubscription(
	ctx context.Context,
	tx pgx.Tx,
	webPushSubscription *webpush.Subscription,
) error {
	_, err := tx.Exec(
		ctx,
		`DELETE FROM webpushsubscriptions where key_auth=$1 AND key_p256dh=$2 AND endpoint=$3`,
		webPushSubscription.Keys.Auth,
		webPushSubscription.Keys.P256dh,
		webPushSubscription.Endpoint,
	)

	return err
}

// RemoveWebPushSubscription deletes a web push subscription.
func (s *PostgresNotificationStore) RemoveWebPushSubscription(
	ctx context.Context,
	userID common.Address,
	webPushSubscription *webpush.Subscription,
) error {
	return s.txRunner(
		ctx,
		"RemoveWebPushSubscription",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.removeWebPushSubscription(ctx, tx, webPushSubscription)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) removeWebPushSubscription(
	ctx context.Context,
	tx pgx.Tx,
	webPushSubscription *webpush.Subscription,
) error {
	_, err := tx.Exec(
		ctx,
		`DELETE FROM webpushsubscriptions where key_auth=$1 AND key_p256dh=$2`,
		webPushSubscription.Keys.Auth,
		webPushSubscription.Keys.P256dh,
	)

	return err
}

func (s *PostgresNotificationStore) GetAPNSubscriptions(
	ctx context.Context,
	userID common.Address,
) ([]*types.APNPushSubscription, error) {
	var (
		err  error
		subs []*types.APNPushSubscription
	)

	err = s.txRunner(
		ctx,
		"GetAPNSubscriptions",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			subs, err = s.getAPNSubscriptions(ctx, tx, userID)
			return err
		},
		nil,
	)

	return subs, err
}

func (s *PostgresNotificationStore) getAPNSubscriptions(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
) ([]*types.APNPushSubscription, error) {
	var subs []*types.APNPushSubscription
	rows, err := tx.Query(
		ctx,
		"select device_token, environment, last_seen, user_id, push_version from apnpushsubscriptions where user_id=$1",
		hex.EncodeToString(userID[:]),
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return subs, nil
		}
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			deviceToken []byte
			environment APNEnvironment
			lastSeen    time.Time
			fUserID     []byte
			pushVersion int32
		)
		err = rows.Scan(&deviceToken, &environment, &lastSeen, &fUserID, &pushVersion)
		if err != nil {
			return nil, err
		}

		subs = append(subs, &types.APNPushSubscription{
			DeviceToken: deviceToken,
			LastSeen:    lastSeen,
			Environment: environment,
			PushVersion: NotificationPushVersion(pushVersion),
		})
	}

	return subs, nil
}

func (s *PostgresNotificationStore) AddAPNSubscription(
	ctx context.Context,
	userID common.Address,
	deviceToken []byte,
	environment APNEnvironment,
	pushVersion NotificationPushVersion,
) error {
	return s.txRunner(
		ctx,
		"AddAPNSubscription",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.addAPNSubscription(ctx, tx, deviceToken, environment, userID, pushVersion)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) addAPNSubscription(
	ctx context.Context,
	tx pgx.Tx,
	deviceToken []byte,
	environment APNEnvironment,
	userID common.Address,
	pushVersion NotificationPushVersion,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO apnpushsubscriptions (device_token, environment, user_id, last_seen, push_version) VALUES ($1, $2, $3, NOW(), $4) ON CONFLICT (device_token) DO UPDATE SET environment = $2, user_id = $3, last_seen = NOW(), push_version = $4`,
		deviceToken,
		int16(environment),
		hex.EncodeToString(userID[:]),
		int32(pushVersion),
	)

	return err
}

func (s *PostgresNotificationStore) RemoveAPNSubscription(ctx context.Context,
	deviceToken []byte,
	userID common.Address,
) error {
	return s.txRunner(
		ctx,
		"RemoveAPNSubscription",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.removeAPNSubscription(ctx, tx, deviceToken, userID)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) removeAPNSubscription(
	ctx context.Context,
	tx pgx.Tx,
	deviceToken []byte,
	userID common.Address,
) error {
	result, err := tx.Exec(
		ctx,
		`DELETE FROM apnpushsubscriptions where device_token=$1`,
		deviceToken,
	)

	dlog.FromCtx(ctx).Info("remove APN subscription",
		"userID", userID, "records", result.RowsAffected(), "err", err)

	return err
}

func (s *PostgresNotificationStore) SetDMChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value DmChannelSettingValue,
) error {
	return s.txRunner(
		ctx,
		"SetDMChannelSetting",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setDMChannelSetting(ctx, tx, userID, channelID, value)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) setDMChannelSetting(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	channelID shared.StreamId,
	value DmChannelSettingValue,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1, $2, $3) ON CONFLICT (user_id, channel_id) DO UPDATE SET setting = $3`,
		hex.EncodeToString(userID[:]),
		channelID,
		int16(value),
	)

	return err
}

func (s *PostgresNotificationStore) SetGDMChannelSetting(
	ctx context.Context,
	userID common.Address,
	channelID shared.StreamId,
	value GdmChannelSettingValue,
) error {
	return s.txRunner(
		ctx,
		"SetGDMChannelSetting",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setGDMChannelSetting(ctx, tx, userID, channelID, value)
		},
		nil,
		"userID", userID,
	)
}

func (s *PostgresNotificationStore) setGDMChannelSetting(
	ctx context.Context,
	tx pgx.Tx,
	userID common.Address,
	channelID shared.StreamId,
	value GdmChannelSettingValue,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO channels (user_id, channel_id, setting) VALUES ($1, $2, $3) ON CONFLICT (user_id, channel_id) DO UPDATE SET setting = $3`,
		hex.EncodeToString(userID[:]),
		channelID,
		int16(value),
	)

	return err
}
