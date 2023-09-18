package infra_config

type LogConfig struct {
	Level        string // Used for both file and console if their levels not set explicitly
	File         string // Path to log file
	FileLevel    string // If not set, use Level
	Console      bool   // Log to sederr if true
	ConsoleLevel string // If not set, use Level
	NoColor      bool
	Format       string // "json" or "text"
}

type MetricsConfig struct {
	Enabled   bool
	Interface string
	Port      int
}
