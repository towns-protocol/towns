package builder_test

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/config/builder"
	"github.com/spf13/pflag"
	"github.com/stretchr/testify/require"
)

type Config struct {
	StrField   string
	IntField   int
	BoolField  bool
	FalseField bool
	ZeroField  int
	StrEmpty   string
	NeverSet   string
	Sub        SubConfig
	Extra1     string
	Extra2     string
	Extra3     string
	Extra4     string
	Period     time.Duration
	Address    common.Address
	Uints      []uint64
}

type SubConfig struct {
	SubStr string
	SubInt int
}

func defaultConfig() *Config {
	return &Config{
		FalseField: true,
		ZeroField:  1,
		StrEmpty:   "default",
		NeverSet:   "default",
		Sub: SubConfig{
			SubInt: 55,
		},
	}
}

func TestNoOp(t *testing.T) {
	require := require.New(t)

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("", cfg.StrField)
	require.Equal(0, cfg.IntField)
	require.Equal(false, cfg.BoolField)
	require.Equal(true, cfg.FalseField)
	require.Equal(1, cfg.ZeroField)
	require.Equal("default", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("", cfg.Sub.SubStr)
	require.Equal(55, cfg.Sub.SubInt)
}

func TestEnvOnly(t *testing.T) {
	require := require.New(t)

	t.Setenv("TEST_STRFIELD", "hello")
	t.Setenv("TEST_INTFIELD", "123")
	t.Setenv("TEST_BOOLFIELD", "true")
	t.Setenv("TEST_FALSEFIELD", "false")
	t.Setenv("TEST_ZEROFIELD", "0")
	t.Setenv("TEST_STREMPTY", "")
	t.Setenv("TEST_SUB_SUBSTR", "sub")

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello", cfg.StrField)
	require.Equal(123, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal(false, cfg.FalseField)
	require.Equal(0, cfg.ZeroField)
	require.Equal("", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("sub", cfg.Sub.SubStr)
}

func TestFlags(t *testing.T) {
	require := require.New(t)

	pflags := pflag.NewFlagSet("test", pflag.ContinueOnError)
	pflags.String("str_flag", "default", "string field")
	pflags.Int("int_flag", 19, "int field")
	pflags.Bool("bool_flag", false, "bool field")
	pflags.String("str2_flag", "sub default", "string field")
	pflags.Int("int2_flag", 21, "int field")
	pflags.Set("str_flag", "hello flag")
	pflags.Set("int_flag", "12345")
	pflags.Set("bool_flag", "true")
	pflags.Set("str2_flag", "sub hello")

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	require.NoError(b.BindPFlag("StrField", pflags.Lookup("str_flag")))
	require.NoError(b.BindPFlag("IntField", pflags.Lookup("int_flag")))
	require.NoError(b.BindPFlag("BoolField", pflags.Lookup("bool_flag")))
	require.NoError(b.BindPFlag("Sub.SubStr", pflags.Lookup("str2_flag")))
	require.NoError(b.BindPFlag("Sub.SubInt", pflags.Lookup("int2_flag")))

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello flag", cfg.StrField)
	require.Equal(12345, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal("sub hello", cfg.Sub.SubStr)
	require.Equal(21, cfg.Sub.SubInt)
}

func TestSingleFile(t *testing.T) {
	require := require.New(t)

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	require.NoError(b.LoadConfig("testdata/test_first.yaml"))

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello 1", cfg.StrField)
	require.Equal(11, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal(false, cfg.FalseField)
	require.Equal(0, cfg.ZeroField)
	require.Equal("", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("hello 11", cfg.Sub.SubStr)
}

func TestTwoFiles(t *testing.T) {
	require := require.New(t)

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	require.NoError(b.LoadConfig("testdata/test_first.yaml"))
	require.NoError(b.LoadConfig("testdata/test_second.yaml"))

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello 2", cfg.StrField)
	require.Equal(12, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal(false, cfg.FalseField)
	require.Equal(0, cfg.ZeroField)
	require.Equal("", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("hello 22", cfg.Sub.SubStr)
	require.Equal("extra 1", cfg.Extra1)
	require.Equal("extra 2", cfg.Extra2)
	require.Equal("", cfg.Extra3)
}

func TestEnvFile(t *testing.T) {
	require := require.New(t)

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	require.NoError(b.LoadConfig("testdata/.env"))

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello env file", cfg.StrField)
	require.Equal(1234, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal(false, cfg.FalseField)
	require.Equal(0, cfg.ZeroField)
	require.Equal("", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("sub sub str", cfg.Sub.SubStr)
	require.Equal("extra3", cfg.Extra3)
}

func TestAllTogether(t *testing.T) {
	require := require.New(t)

	t.Setenv("TEST_STRFIELD", "hello all")

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	pflags := pflag.NewFlagSet("test", pflag.ContinueOnError)
	pflags.String("extra1_flag", "default 1", "string field")
	pflags.String("extra2_flag", "default 2", "string field")
	pflags.Set("extra1_flag", "extra 111")

	require.NoError(b.BindPFlag("Extra1", pflags.Lookup("extra1_flag")))
	require.NoError(b.BindPFlag("Extra2", pflags.Lookup("extra2_flag")))

	require.NoError(b.LoadConfig("testdata/test_first.yaml"))
	require.NoError(b.LoadConfig("testdata/.env"))
	require.NoError(b.LoadConfig("testdata/test_second.yaml"))

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal("hello all", cfg.StrField)
	require.Equal(12, cfg.IntField)
	require.Equal(true, cfg.BoolField)
	require.Equal(false, cfg.FalseField)
	require.Equal(0, cfg.ZeroField)
	require.Equal("", cfg.StrEmpty)
	require.Equal("default", cfg.NeverSet)
	require.Equal("hello 22", cfg.Sub.SubStr)
	require.Equal("extra 111", cfg.Extra1)
	require.Equal("extra 2", cfg.Extra2)
	require.Equal("extra3", cfg.Extra3)
	require.Equal("extra 44", cfg.Extra4)
}

func TestHooks(t *testing.T) {
	require := require.New(t)

	addr := common.HexToAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
	t.Setenv("TEST_PERIOD", "22s")
	t.Setenv("TEST_ADDRESS", addr.Hex())
	t.Setenv("TEST_UINTS", "1,2,3,4,5")

	b, err := builder.NewConfigBuilder(defaultConfig(), "TEST")
	require.NoError(err)

	cfg, err := b.Build()
	require.NoError(err)

	require.Equal(22*time.Second, cfg.Period)
	require.Equal(addr, cfg.Address)
	require.Equal([]uint64{1, 2, 3, 4, 5}, cfg.Uints)
}

func TestAllTogether2(t *testing.T) {
	require := require.New(t)

	t.Setenv("TEST_STRFIELD", "hello all")

	pflags := pflag.NewFlagSet("test", pflag.ContinueOnError)
	var configFiles []string
	pflags.StringSliceVarP(
		&configFiles,
		"config",
		"c",
		[]string{"def"},
		"Path to the configuration file. Can be specified multiple times. Values are applied in sequence.",
	)
	pflags.Set("config", "")

	require.Equal([]string{}, configFiles)
}
