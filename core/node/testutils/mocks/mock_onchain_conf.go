package mocks

import (
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
)

type MockOnChainCfg struct {
	Settings *crypto.OnChainSettings
}

func (m *MockOnChainCfg) ActiveBlock() crypto.BlockNumber { return 0 }

func (m *MockOnChainCfg) Get() *crypto.OnChainSettings { return m.Settings }

func (m *MockOnChainCfg) GetOnBlock(block crypto.BlockNumber) *crypto.OnChainSettings {
	return m.Settings
}

func (m *MockOnChainCfg) All() []*crypto.OnChainSettings {
	return []*crypto.OnChainSettings{m.Settings}
}

func (m *MockOnChainCfg) LastAppliedEvent() *river.RiverConfigV1ConfigurationChanged { return nil }
