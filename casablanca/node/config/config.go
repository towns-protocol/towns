package config

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Port          int
	Address       string
	DbUrl         string
	Metrics       MetricsConfig
	Chain         ChainConfig
	Authorization bool

	Log struct {
		Level  string
		File   string
		Events string
	}
}

type MetricsConfig struct {
	Enabled   bool
	Interface string
	Port      int
}

type ChainConfig struct {
	NetworkUrl string
	ChainId    int
}
