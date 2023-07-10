package common

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

const (
	STREAM_USER_PREFIX            = "00"
	STREAM_SPACE_PREFIX           = "11"
	STREAM_CHANNEL_PREFIX         = "22"
	STREAM_USER_DEVICE_KEY_PREFIX = "33"
)

func UserIdFromAddress(address []byte) (string, error) {
	if len(address) != 20 {
		return "", fmt.Errorf("invalid address length %d", len(address))
	}
	return common.BytesToAddress(address).Hex(), nil
}

func AddressFromUserId(userId string) ([]byte, error) {
	// check address starts with 0x
	if !strings.HasPrefix(userId, "0x") {
		return nil, fmt.Errorf("invalid user id %s", userId)
	}
	return hex.DecodeString(userId[2:])
}

func UserStreamIdFromAddress(address []byte) (string, error) {
	userId, err := UserIdFromAddress(address)
	if err != nil {
		return "", err
	}
	return STREAM_USER_PREFIX + "-" + userId, nil
}

func ValidUserStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, STREAM_USER_PREFIX+"-0x")
}

func ValidUserDeviceKeyStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, STREAM_USER_DEVICE_KEY_PREFIX+"-0x")
}

func UserDeviceKeyStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", fmt.Errorf("invalid id length %s", id)
	}
	return STREAM_USER_DEVICE_KEY_PREFIX + "-" + id, nil
}

func UserStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", fmt.Errorf("invalid id length %s", id)
	}
	return STREAM_USER_PREFIX + "-" + id, nil
}

func SpaceStreamIdFromName(space string) string {
	return STREAM_SPACE_PREFIX + "-" + space
}

func ChannelStreamIdFromName(channel string) string {
	return STREAM_CHANNEL_PREFIX + "-" + channel
}

func ValidSpaceStreamId(id string) bool {
	return strings.HasPrefix(id, STREAM_SPACE_PREFIX+"-")
}

func ValidChannelStreamId(id string) bool {
	return strings.HasPrefix(id, STREAM_CHANNEL_PREFIX+"-")
}

