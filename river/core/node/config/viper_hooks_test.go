package config_test

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/mitchellh/mapstructure"
	"github.com/river-build/river/core/node/config"
	"github.com/spf13/viper"
)

func TestDecodeHooks(t *testing.T) {
	viper.SetConfigFile("./testdata/test_config.yaml")
	if err := viper.ReadInConfig(); err != nil {
		t.Fatal(err)
	}

	var (
		cfg = struct {
			FromHex     common.Address
			FromFile    common.Address
			DurationOne time.Duration
			DurationTwo time.Duration
		}{}
		expFromHex     = common.HexToAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
		expFromFile    = common.HexToAddress("0x03300DF841dE9089B1Ad4918cDbA863eF84d2Fe6")
		expDurationOne = 10 * time.Second
		expDurationTwo = time.Hour
		decodeHooks    = mapstructure.ComposeDecodeHookFunc(
			config.DecodeAddressOrAddressFileHook(),
			config.DecodeDurationHook(),
		)
	)

	if err := viper.Unmarshal(&cfg, viper.DecodeHook(decodeHooks)); err != nil {
		t.Fatal(err)
	}

	if cfg.FromHex != expFromHex {
		t.Errorf("load address has unexpected value: got %v, want %v", cfg.FromHex, expFromHex)
	}
	if cfg.FromFile != expFromFile {
		t.Errorf("load address has unexpected value: got %v, want %v", cfg.FromFile, expFromFile)
	}
	if cfg.DurationOne != expDurationOne {
		t.Errorf("load duration has unexpected value: got %v, want %v", cfg.DurationOne, expDurationOne)
	}
	if cfg.DurationTwo != expDurationTwo {
		t.Errorf("load address has unexpected value: got %v, want %v", cfg.DurationTwo, expDurationTwo)
	}
}
