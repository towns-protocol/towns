package builder

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

type ConfigBuilder[T any] struct {
	cfg              *T
	v                *viper.Viper
	envMap           map[string]string
	prefix           string
	allViperSettings map[string]any
}

// NewConfigBuilder creates a new ConfigBuilder.
// cfg is a pointer to the config struct that may contain default values.
// envPrefix is the prefix (without '_') for environment variables that will be bound to the config struct.
// NOTE: default values of bound flags override the default values provided in cfg.
func NewConfigBuilder[T any](defaults *T, envPrefix string) (*ConfigBuilder[T], error) {
	b := &ConfigBuilder[T]{
		cfg:    defaults,
		v:      viper.New(),
		envMap: make(map[string]string),
		prefix: envPrefix + "_",
	}
	b.v.AllowEmptyEnv(true)

	configMap := make(map[string]interface{})
	err := mapstructure.Decode(*defaults, &configMap)
	if err != nil {
		return nil, err
	}
	err = bindViperKeys(envPrefix, b.v, "", "", "", configMap, b.envMap)
	if err != nil {
		return nil, err
	}

	return b, nil
}

func (b *ConfigBuilder[T]) LoadConfig(path string) error {
	// Viper doesn't support prefixes in env files, but does support them in env vars.
	// To address this inconsistency, env file is pre-proccessed.
	ext := filepath.Ext(path)
	// TODO: add support for .env.local and so on.
	if ext == ".env" || ext == ".dotenv" {
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		lines := strings.Split(string(data), "\n")
		// Replace known env var names with key names.
		for i, line := range lines {
			index := strings.Index(line, "=")
			if index > 0 {
				envName := strings.TrimSpace(line[:index])
				keyName, ok := b.envMap[envName]
				if ok {
					lines[i] = keyName + "=" + line[index+1:]
				}
			}
		}

		// Hack to let Viper correctly detect the file type.
		b.v.SetConfigFile(path)
		return b.v.MergeConfig(strings.NewReader(strings.Join(lines, "\n")))
	}

	b.v.SetConfigFile(path)
	return b.v.MergeInConfig()
}

// BindPFlag binds a pflag.Flag to a viper key.
// NOTE: flag's default overrides default (if any) provided to the NewConfigBuilder.
func (b *ConfigBuilder[T]) BindPFlag(key string, flag *pflag.Flag) error {
	return b.v.BindPFlag(key, flag)
}

func (b *ConfigBuilder[T]) Build() (*T, error) {
	// Also save all settings for debugging, etc.
	b.allViperSettings = b.v.AllSettings()

	err := b.v.Unmarshal(
		b.cfg,
		viper.DecodeHook(
			mapstructure.ComposeDecodeHookFunc(
				DecodeAddressOrAddressFileHook(),
				DecodeDurationHook(),
				DecodeUint64SliceHook(),
			),
		),
	)
	if err != nil {
		return nil, err
	}

	return b.cfg, nil
}

func (b *ConfigBuilder[T]) AllViperSettings() map[string]any {
	return b.allViperSettings
}

func (b *ConfigBuilder[T]) EnvMap() map[string]string {
	return b.envMap
}

// This iterates over all possible keys in m and binds evn vars to them
// For each key, there are two bound env vars like so:
// Mertics.Enabled <= PREFIX_METRICS_ENABLED, METRICS__ENABLED
// With PREFIX_METRICS_ENABLED being canonical and recommended.
// The double underscore version is for compatibility with older versions of the settings.
func bindViperKeys(
	prefix string,
	vpr *viper.Viper,
	varPrefix string,
	envPrefixSingle string,
	envPrefixDouble string,
	m map[string]interface{},
	envMap map[string]string,
) error {
	for k, v := range m {
		subMap, ok := v.(map[string]interface{})
		if ok {
			upperK := strings.ToUpper(k)
			err := bindViperKeys(
				prefix,
				vpr,
				varPrefix+k+".",
				envPrefixSingle+upperK+"_",
				envPrefixDouble+upperK+"__",
				subMap,
				envMap,
			)
			if err != nil {
				return err
			}
		} else {
			varName := varPrefix + k
			envName := strings.ToUpper(k)
			canonical := prefix + "_" + envPrefixSingle + envName
			envMap[canonical] = varName
			err := vpr.BindEnv(varName, canonical, envPrefixDouble+envName)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
