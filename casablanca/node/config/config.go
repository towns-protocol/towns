package config

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Port    int
	Address string
	DbUrl   string
	Metrics MetricsConfig

	Log struct {
		Level string
		File  string
	}
}

type MetricsConfig struct {
	Enabled   bool
	Interface string
	Port      int
}
