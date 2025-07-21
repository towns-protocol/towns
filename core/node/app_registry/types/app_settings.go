package types

import (
	"github.com/towns-protocol/towns/core/node/protocol"
)

type AppSettings struct {
	ForwardSetting protocol.ForwardSettingValue
}

func ProtocolToStorageAppSettings(settings *protocol.AppSettings) AppSettings {
	return AppSettings{
		ForwardSetting: settings.GetForwardSetting(),
	}
}

func StorageToProtocolAppSettings(settings AppSettings) *protocol.AppSettings {
	return &protocol.AppSettings{
		ForwardSetting: settings.ForwardSetting,
	}
}
