package config

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Port          int
	Address       string
	DbUrl         string
	Metrics       MetricsConfig
	Chain         ChainConfig
	Authorization bool
	Log           LogConfig
}

type LogConfig struct {
	Level        string // Used for both file and console if their levels not set explicitly
	File         string // Path to log file
	FileLevel    string // If not set, use Level
	Console      bool   // Log to sederr if true
	ConsoleLevel string // If not set, use Level
	NoColor      bool
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
