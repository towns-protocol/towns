package common

import (
	"encoding/hex"
	"fmt"
	"strings"

	. "casablanca/node/base"
	. "casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"golang.org/x/exp/slices"
)

const (
	STREAM_USER_PREFIX          = "00"
	STREAM_USER_PREFIX_DASH     = "00-"
	STREAM_USER_PREFIX_DASH_HEX = "00-0x"

	STREAM_SPACE_PREFIX      = "11"
	STREAM_SPACE_PREFIX_DASH = "11-"

	STREAM_CHANNEL_PREFIX      = "22"
	STREAM_CHANNEL_PREFIX_DASH = "22-"

	STREAM_USER_DEVICE_KEY_PREFIX          = "33"
	STREAM_USER_DEVICE_KEY_PREFIX_DASH     = "33-"
	STREAM_USER_DEVICE_KEY_PREFIX_DASH_HEX = "33-0x"

	STREAM_USER_SETTINGS_PREFIX          = "44"
	STREAM_USER_SETTINGS_PREFIX_DASH     = "44-"
	STREAM_USER_SETTINGS_PREFIX_DASH_HEX = "44-0x"

	STREAM_MEDIA_PREFIX      = "55"
	STREAM_MEDIA_PREFIX_DASH = "55-"

	STREAM_DM_CHANNEL_PREFIX      = "66"
	STREAM_DM_CHANNEL_PREFIX_DASH = "66-"
)

func AddressHex(address []byte) (string, error) {
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
	userId, err := AddressHex(address)
	if err != nil {
		return "", err
	}
	return STREAM_USER_PREFIX_DASH + userId, nil
}

func ValidUserStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, STREAM_USER_PREFIX_DASH_HEX)
}

func ValidUserDeviceKeyStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, STREAM_USER_DEVICE_KEY_PREFIX_DASH_HEX)
}

func ValidUserSettingsStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, STREAM_USER_SETTINGS_PREFIX_DASH_HEX)
}

func CheckUserStreamIdForPrefix(streamId string, creatorUserId []byte, expectedPrefix string) error {
	u, err := AddressHex(creatorUserId)
	if err != nil {
		return err
	}
	expected := expectedPrefix + u
	if streamId == expected {
		return nil
	}
	return RiverError(Err_BAD_STREAM_ID, "Stream ID doesn't match creator address or expected prefix", "streamId", streamId, "expected", expected)
}

func CheckUserStreamId(streamId string, creatorUserId []byte) error {
	return CheckUserStreamIdForPrefix(streamId, creatorUserId, STREAM_USER_PREFIX_DASH)
}

func CheckUserDeviceKeyStreamId(streamId string, creatorUserId []byte) error {
	return CheckUserStreamIdForPrefix(streamId, creatorUserId, STREAM_USER_DEVICE_KEY_PREFIX_DASH)
}

func CheckUserSettingsStreamId(streamId string, creatorUserId []byte) error {
	return CheckUserStreamIdForPrefix(streamId, creatorUserId, STREAM_USER_SETTINGS_PREFIX_DASH)
}

func CheckMediaStreamId(streamId string) bool {
	return strings.HasPrefix(streamId, STREAM_MEDIA_PREFIX_DASH)
}

func UserDeviceKeyStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", RiverError(Err_BAD_STREAM_ID, "invalid id length", "id", id)
	}
	return STREAM_USER_DEVICE_KEY_PREFIX + "-" + id, nil
}

func UserStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", RiverError(Err_BAD_STREAM_ID, "invalid id length", "id", id)
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
	return strings.HasPrefix(id, STREAM_SPACE_PREFIX_DASH)
}

func ValidChannelStreamId(id string) bool {
	return strings.HasPrefix(id, STREAM_CHANNEL_PREFIX_DASH)
}

func hashString(str string) string {
	slice := crypto.Keccak256([]byte(str))
	return fmt.Sprintf("%x", slice)
}

func ValidDMChannelStreamId(id string, userIdA []byte, userIdB []byte) bool {
	// Lowercase the user ids, sort them and join them with a dash
	addressUserA, err := AddressHex(userIdA)
	if err != nil {
		return false
	}
	addressUserB, err := AddressHex(userIdB)
	if err != nil {
		return false
	}

	ids := []string{strings.ToLower(addressUserA), strings.ToLower(addressUserB)}
	slices.Sort(ids)
	joined := strings.Join(ids, "-")
	streamId := STREAM_DM_CHANNEL_PREFIX_DASH + hashString(joined)
	return id == streamId
}
