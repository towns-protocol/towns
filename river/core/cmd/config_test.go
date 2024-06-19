package cmd

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func clean() {
	configFile = ""
	cmdConfig = nil
}

func TestBlockchainConfiNotSetByDefault(t *testing.T) {
	clean()
	require := require.New(t)

	configFile = "../node/default_config.yaml"
	cmdConfig, _, _, err := initViperConfig()
	require.NoError(err)
	require.NotNil(cmdConfig)

	require.Empty(cmdConfig.Chains)
	require.Empty(cmdConfig.ChainConfigs)
	require.Empty(cmdConfig.XChainBlockchains)
}

func TestBlockchainConfigSetByEnv(t *testing.T) {
	clean()
	require := require.New(t)

	chainsValue := "1:https//eth0.org/foobar,2:https//eth1.org/foobar,123:https//eth123.org/foobar,6524490:https//river.org/foobar"
	xchainsValue := "1,2"
	t.Setenv("CHAINS", chainsValue)
	t.Setenv("CHAINBLOCKTIMES", "2:100s,123:2.5s")
	t.Setenv("XCHAINBLOCKCHAINS", xchainsValue)

	configFile = "../node/default_config.yaml"
	cmdConfig, _, _, err := initViperConfig()
	require.NoError(err)
	require.NotNil(cmdConfig)

	require.Equal(chainsValue, cmdConfig.Chains)
	require.Len(cmdConfig.ChainConfigs, 4)

	require.Equal("https//eth0.org/foobar", cmdConfig.ChainConfigs[1].NetworkUrl)
	require.Equal(uint64(12000), cmdConfig.ChainConfigs[1].BlockTimeMs)

	require.Equal("https//eth1.org/foobar", cmdConfig.ChainConfigs[2].NetworkUrl)
	require.Equal(uint64(100000), cmdConfig.ChainConfigs[2].BlockTimeMs)

	require.Equal("https//eth123.org/foobar", cmdConfig.ChainConfigs[123].NetworkUrl)
	require.Equal(uint64(2500), cmdConfig.ChainConfigs[123].BlockTimeMs)

	require.Equal("https//river.org/foobar", cmdConfig.ChainConfigs[6524490].NetworkUrl)
	require.Equal(uint64(2000), cmdConfig.ChainConfigs[6524490].BlockTimeMs)

	require.Equal([]uint64{1, 2}, cmdConfig.XChainBlockchains)
}

func TestXChainFallback(t *testing.T) {
	clean()
	require := require.New(t)

	chainsValue := "1:https//eth0.org/foobar,2:https//eth1.org/foobar,123:https//eth123.org/foobar,6524490:https//river.org/foobar"
	t.Setenv("CHAINS", chainsValue)
	t.Setenv("CHAINBLOCKTIMES", "2:100s,123:2.5s")
	t.Setenv("XCHAINBLOCKCHAINS", "")

	configFile = "../node/default_config.yaml"
	cmdConfig, _, _, err := initViperConfig()
	require.NoError(err)
	require.NotNil(cmdConfig)

	require.Equal(chainsValue, cmdConfig.Chains)
	require.Len(cmdConfig.ChainConfigs, 4)

	require.Equal("https//eth0.org/foobar", cmdConfig.ChainConfigs[1].NetworkUrl)
	require.Equal(uint64(12000), cmdConfig.ChainConfigs[1].BlockTimeMs)

	require.Equal("https//eth1.org/foobar", cmdConfig.ChainConfigs[2].NetworkUrl)
	require.Equal(uint64(100000), cmdConfig.ChainConfigs[2].BlockTimeMs)

	require.Equal("https//eth123.org/foobar", cmdConfig.ChainConfigs[123].NetworkUrl)
	require.Equal(uint64(2500), cmdConfig.ChainConfigs[123].BlockTimeMs)

	require.Equal("https//river.org/foobar", cmdConfig.ChainConfigs[6524490].NetworkUrl)
	require.Equal(uint64(2000), cmdConfig.ChainConfigs[6524490].BlockTimeMs)

	require.ElementsMatch([]uint64{1, 2, 123, 6524490}, cmdConfig.XChainBlockchains)
}

func TestBlockchainChainsStringFallbakc(t *testing.T) {
	clean()
	require := require.New(t)

	chainsValue := "1:https//eth0.org/foobar,2:https//eth1.org/foobar,123:https//eth123.org/foobar,6524490:https//river.org/foobar"
	xchainsValue := "1,2"
	t.Setenv("CHAINS", "")
	t.Setenv("CHAINSSTRING", chainsValue)
	t.Setenv("CHAINBLOCKTIMES", "2:100s,123:2.5s")
	t.Setenv("XCHAINBLOCKCHAINS", xchainsValue)

	configFile = "../node/default_config.yaml"
	cmdConfig, _, _, err := initViperConfig()
	require.NoError(err)
	require.NotNil(cmdConfig)

	require.Equal(chainsValue, cmdConfig.Chains)
	require.Len(cmdConfig.ChainConfigs, 4)

	require.Equal("https//eth0.org/foobar", cmdConfig.ChainConfigs[1].NetworkUrl)
	require.Equal(uint64(12000), cmdConfig.ChainConfigs[1].BlockTimeMs)

	require.Equal("https//eth1.org/foobar", cmdConfig.ChainConfigs[2].NetworkUrl)
	require.Equal(uint64(100000), cmdConfig.ChainConfigs[2].BlockTimeMs)

	require.Equal("https//eth123.org/foobar", cmdConfig.ChainConfigs[123].NetworkUrl)
	require.Equal(uint64(2500), cmdConfig.ChainConfigs[123].BlockTimeMs)

	require.Equal("https//river.org/foobar", cmdConfig.ChainConfigs[6524490].NetworkUrl)
	require.Equal(uint64(2000), cmdConfig.ChainConfigs[6524490].BlockTimeMs)

	require.Equal([]uint64{1, 2}, cmdConfig.XChainBlockchains)
}
