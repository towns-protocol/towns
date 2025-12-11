package config_test

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestDatabaseConfig_UrlAndPasswordDoesNotLog(t *testing.T) {
	cfg := config.DatabaseConfig{
		Url:           "pg://host:port",
		Host:          "localhost",
		Port:          5432,
		User:          "user",
		Password:      "password",
		Database:      "testdb",
		Extra:         "extra",
		NumPartitions: 256,
	}
	// Log cfg to buffer
	logger, buffer := testutils.ZapJsonLogger()
	logger.Infow("test message", "databaseConfig", cfg)

	logOutput := buffer.String()
	logOutput = testutils.RemoveJsonTimestamp(logOutput)

	// Uncomment to write log output to test file.
	// os.WriteFile("testdata/databaseconfig_json.txt", []byte(logOutput), 0644)

	expectedBytes, err := os.ReadFile("testdata/databaseconfig_json.txt")
	require.NoError(t, err)
	expected := testutils.RemoveJsonTimestamp(string(expectedBytes))

	// Assert output is as expected: password is not logged, other fields included
	require.Equal(t, expected, logOutput)
}

func TestTlsConfig_KeyDoesNotLog(t *testing.T) {
	cfg := config.TLSConfig{
		Key:  "keyvalue",
		Cert: "certvalue",
	}

	// Log cfg to buffer
	logger, buffer := testutils.ZapJsonLogger()
	logger.Infow("test message", "tlsConfig", cfg)

	logOutput := buffer.String()
	logOutput = testutils.RemoveJsonTimestamp(logOutput)

	// Uncomment to write log output to test file.
	// os.WriteFile("testdata/tlsconfig_json.txt", []byte(logOutput), 0644)

	expectedBytes, err := os.ReadFile("testdata/tlsconfig_json.txt")
	require.NoError(t, err)
	expected := testutils.RemoveJsonTimestamp(string(expectedBytes))

	// Assert output is as expected: TLS Key is not logged, other fields included
	require.Equal(t, expected, logOutput)
}

func TestNotificationsConfig_SensitiveKeysDontLog(t *testing.T) {
	cfg := config.NotificationsConfig{
		Apps: []config.AppNotificationConfig{
			{
				App: "towns",
				APN: config.APNPushNotificationsConfig{
					AuthKey: "APN_AUTH_KEY",
				},
				Web: config.WebPushNotificationConfig{
					Vapid: config.WebPushVapidNotificationConfig{
						PrivateKey: "WEB_VAPID_PRIVATE_KEY",
					},
				},
			},
		},
		Authentication: config.AuthenticationConfig{
			SessionToken: config.SessionTokenConfig{
				Key: config.SessionKeyConfig{
					Algorithm: "SESSION_KEY_ALGORITHM",
					Key:       "SESSION_KEY",
				},
			},
		},
	}

	// Log cfg to buffer
	logger, buffer := testutils.ZapJsonLogger()
	logger.Infow("test message", "notificationsConfig", cfg)

	logOutput := buffer.String()
	require := require.New(t)

	require.NotContains(logOutput, "APN_AUTH_KEY", "Expected APN_AUTH_KEY to be omitted from logOutput `%v`", logOutput)
	require.NotContains(
		logOutput,
		"WEB_VAPID_PRIVATE_KEY",
		"Expected WEB_VAPID_PRIVATE_KEY to be omitted from logOutput `%v`",
		logOutput,
	)
	require.NotContains(
		logOutput,
		"SESSION_KEY_ALGORITHM",
		"Expected SESSION_KEY_ALGORITHM to be omitted from logOutput `%v`",
		logOutput,
	)
	require.NotContains(logOutput, "SESSION_KEY", "Expected SESSION_KEY to be omitted from logOutput `%v`", logOutput)
}

func TestConfig_ChainProvidersDoNotLog(t *testing.T) {
	cfg := config.Config{
		// In practice both of these fields would contain private information in key:value pairs separated
		// by commas, but we really just don't want to see whatever the value is in the log output.
		Chains:       "CHAINS",
		ChainsString: "CHAINS_STRING",
	}

	// Log cfg to buffer
	logger, buffer := testutils.ZapJsonLogger()
	logger.Infow("test message", "config", cfg)

	logOutput := buffer.String()
	require := require.New(t)

	require.NotContains(
		logOutput,
		"CHAINS_STRING",
		"Expected CHAINS_STRING to be omitted from logOutput `%v`",
		logOutput,
	)
	require.NotContains(logOutput, "CHAINS", "Expected CHAINS to be omitted from logOutput `%v`", logOutput)
}

func TestHighUsageDetectionConfig_DefaultThresholds(t *testing.T) {
	cfg := config.HighUsageDetectionConfig{
		Thresholds: config.HighUsageThresholdFields{
			ThresholdAddEventWindow1: time.Minute,
			ThresholdAddEventCount1:  100,
		},
	}

	values := cfg.HighUsageThresholds()
	require.Len(t, values, 1)
	require.Len(t, values["event"], 1)
	require.Equal(t, time.Minute, values["event"][0].Window)
	require.Equal(t, uint32(100), values["event"][0].Count)
}

func TestHighUsageDetectionConfig_MultipleCallTypes(t *testing.T) {
	cfg := config.HighUsageDetectionConfig{
		Thresholds: config.HighUsageThresholdFields{
			ThresholdAddEventWindow1:          2 * time.Minute,
			ThresholdAddEventCount1:           200,
			ThresholdAddMediaEventWindow1:     45 * time.Second,
			ThresholdAddMediaEventCount1:      15,
			ThresholdCreateMediaStreamWindow1: 90 * time.Second,
			ThresholdCreateMediaStreamCount1:  25,
		},
	}

	values := cfg.HighUsageThresholds()

	require.Len(t, values["event"], 1)
	require.Equal(t, 2*time.Minute, values["event"][0].Window)
	require.Equal(t, uint32(200), values["event"][0].Count)
	require.Len(t, values["media_event"], 1)
	require.Equal(t, 45*time.Second, values["media_event"][0].Window)
	require.Equal(t, uint32(15), values["media_event"][0].Count)
	require.Len(t, values["create_media_stream"], 1)
	require.Equal(t, 90*time.Second, values["create_media_stream"][0].Window)
	require.Equal(t, uint32(25), values["create_media_stream"][0].Count)
}

func TestHighUsageDetectionConfig_MultipleThresholdsPerCallType(t *testing.T) {
	cfg := config.HighUsageDetectionConfig{
		Thresholds: config.HighUsageThresholdFields{
			ThresholdAddEventWindow1: time.Minute,
			ThresholdAddEventCount1:  100,
			ThresholdAddEventWindow2: 5 * time.Minute,
			ThresholdAddEventCount2:  400,
		},
	}

	values := cfg.HighUsageThresholds()

	require.Len(t, values, 1)
	require.Len(t, values["event"], 2)
	require.Equal(t, []config.HighUsageThreshold{
		{Window: time.Minute, Count: 100},
		{Window: 5 * time.Minute, Count: 400},
	}, values["event"])
}

func TestHighUsageDetectionConfig_InvalidEntriesIgnored(t *testing.T) {
	cfg := config.HighUsageDetectionConfig{
		Thresholds: config.HighUsageThresholdFields{
			ThresholdAddEventWindow1:          0,
			ThresholdAddEventCount1:           100,
			ThresholdAddMediaEventWindow1:     time.Minute,
			ThresholdAddMediaEventCount1:      0,
			ThresholdCreateMediaStreamWindow1: 30 * time.Second,
			ThresholdCreateMediaStreamCount1:  5,
			ThresholdCreateMediaStreamWindow2: time.Second,
			ThresholdCreateMediaStreamCount2:  0,
		},
	}

	values := cfg.HighUsageThresholds()

	require.Equal(t, map[string][]config.HighUsageThreshold{
		"create_media_stream": {
			{Window: 30 * time.Second, Count: 5},
		},
	}, values)
}
