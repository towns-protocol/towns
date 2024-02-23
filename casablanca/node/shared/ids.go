package shared

import (
	"encoding/hex"
	"slices"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

const (
	STREAM_CHANNEL_BIN            uint8 = 0x20
	STREAM_CHANNEL_PREFIX               = "20"
	STREAM_DM_CHANNEL_BIN         uint8 = 0x88
	STREAM_DM_CHANNEL_PREFIX            = "88"
	STREAM_GDM_CHANNEL_BIN        uint8 = 0x77
	STREAM_GDM_CHANNEL_PREFIX           = "77"
	STREAM_MEDIA_BIN              uint8 = 0xff
	STREAM_MEDIA_PREFIX                 = "ff"
	STREAM_SPACE_BIN              uint8 = 0x10
	STREAM_SPACE_PREFIX                 = "10"
	STREAM_USER_DEVICE_KEY_BIN    uint8 = 0xad
	STREAM_USER_DEVICE_KEY_PREFIX       = "ad"
	STREAM_USER_INBOX_BIN         uint8 = 0xa1
	STREAM_USER_INBOX_PREFIX            = "a1"
	STREAM_USER_BIN               uint8 = 0xa8
	STREAM_USER_PREFIX                  = "a8"
	STREAM_USER_SETTINGS_BIN      uint8 = 0xa5
	STREAM_USER_SETTINGS_PREFIX         = "a5"
)

func AddressHex(address []byte) (string, error) {
	if len(address) != 20 {
		return "", RiverError(Err_BAD_ADDRESS, "wrong length", "addr", address)
	}
	return common.BytesToAddress(address).Hex(), nil
}

func AddressFromUserId(userId string) ([]byte, error) {
	if len(userId) != 42 {
		return nil, RiverError(Err_BAD_ADDRESS, "wrong length", "userId", userId)
	}
	if !strings.HasPrefix(userId, "0x") {
		return nil, RiverError(Err_BAD_ADDRESS, "address should start with 0x", "userId", userId)
	}
	return hex.DecodeString(userId[2:])
}

func UserStreamIdFromAddress(addr common.Address) (string, error) {
	return STREAM_USER_PREFIX + hex.EncodeToString(addr.Bytes()), nil
}

func UserDeviceKeyStreamIdFromAddress(addr common.Address) string {
	return STREAM_USER_DEVICE_KEY_PREFIX + hex.EncodeToString(addr.Bytes())
}

func GetStreamIdPrefix(streamId string) string {
	return streamId[:2]
}

func GetUserAddressFromStreamId(streamId string) (common.Address, error) {
	prefix := GetStreamIdPrefix(streamId)
	if prefix != STREAM_USER_PREFIX &&
		prefix != STREAM_USER_DEVICE_KEY_PREFIX &&
		prefix != STREAM_USER_INBOX_PREFIX &&
		prefix != STREAM_USER_SETTINGS_PREFIX {
		return common.Address{}, RiverError(Err_BAD_STREAM_ID, "invalid stream type for getting user", "streamId", streamId)
	}
	if len(streamId) != 42 || !isLowercaseHex(streamId) {
		return common.Address{}, RiverError(Err_BAD_STREAM_ID, "invalid stream id", "streamId", streamId)
	}
	return common.HexToAddress(streamId[2:]), nil
}

func GetUserAddressStringFromStreamId(streamId string) (string, error) {
	addr, err := GetUserAddressFromStreamId(streamId)
	if err != nil {
		return "", err
	}
	return addr.Hex(), nil
}

func isLowercaseHex(s string) bool {
	for _, c := range s {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
			return false
		}
	}
	return true
}

func CheckUserStreamIdForPrefix(streamId string, creatorUserId []byte, expectedPrefix string) error {
	expected := expectedPrefix + hex.EncodeToString(creatorUserId)
	if streamId == expected {
		return nil
	}
	return RiverError(
		Err_BAD_STREAM_ID,
		"Stream ID doesn't match creator address or expected prefix",
		"streamId",
		streamId,
		"expected",
		expected,
	)
}

func CheckMediaStreamId(streamId string) bool {
	return IsValidIdForPrefix(streamId, STREAM_MEDIA_PREFIX)
}

func CheckDMStreamId(streamId string) bool {
	return IsValidIdForPrefix(streamId, STREAM_DM_CHANNEL_PREFIX)
}

func UserStreamIdFromId(id string) (string, error) {
	if !common.IsHexAddress(id) {
		return "", RiverError(Err_BAD_STREAM_ID, "invalid id", "id", id)
	}
	id = strings.TrimPrefix(id, "0x")
	return STREAM_USER_PREFIX + strings.ToLower(id), nil
}

func ExpectedStreamIdLength(prefix string) int {
	switch prefix {
	case STREAM_USER_DEVICE_KEY_PREFIX:
		return 42
	case STREAM_USER_INBOX_PREFIX:
		return 42
	case STREAM_USER_PREFIX:
		return 42
	case STREAM_USER_SETTINGS_PREFIX:
		return 42
	default:
		return 64
	}
}

func IsValidIdForPrefix(id string, prefix string) bool {
	return len(id) == ExpectedStreamIdLength(prefix) && strings.HasPrefix(id, prefix) && isLowercaseHex(id)
}

func ValidSpaceStreamId(id string) bool {
	return IsValidIdForPrefix(id, STREAM_SPACE_PREFIX)
}

func ValidChannelStreamId(id string) bool {
	return IsValidIdForPrefix(id, STREAM_CHANNEL_PREFIX)
}

func ValidDMChannelStreamId(id string) bool {
	return IsValidIdForPrefix(id, STREAM_DM_CHANNEL_PREFIX)
}

func DMStreamIdForUsers(a []byte, b []byte) (string, error) {
	// Lowercase the user ids, sort them and join them with a dash
	addressUserA, err := AddressHex(a)
	if err != nil {
		return "", err
	}
	addressUserB, err := AddressHex(b)
	if err != nil {
		return "", err
	}

	ids := []string{strings.ToLower(addressUserA), strings.ToLower(addressUserB)}
	slices.Sort(ids)
	joined := strings.Join(ids, "-")
	hash := crypto.Keccak256([]byte(joined))
	return STREAM_DM_CHANNEL_PREFIX + hex.EncodeToString(hash[:31]), nil
}

func ValidDMChannelStreamIdBetween(id string, userIdA []byte, userIdB []byte) bool {
	expected, err := DMStreamIdForUsers(userIdA, userIdB)
	if err != nil {
		return false
	}
	return id == expected
}

func ValidGDMChannelStreamId(id string) bool {
	return IsValidIdForPrefix(id, STREAM_GDM_CHANNEL_PREFIX)
}
