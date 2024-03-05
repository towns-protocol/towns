package shared

import (
	"encoding/hex"
	"slices"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
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

func UserStreamIdFromBytes(addr []byte) (StreamId, error) {
	address, err := BytesToEthAddress(addr)
	if err != nil {
		return StreamId{}, err
	}
	return UserStreamIdFromAddr(address), nil
}

func UserStreamIdFromAddr(addr common.Address) StreamId {
	var b StreamId
	b.bytes[0] = STREAM_USER_BIN
	copy(b.bytes[1:], addr.Bytes())
	return b
}

func UserDeviceKeyStreamIdFromAddress(addr common.Address) string {
	return STREAM_USER_DEVICE_KEY_PREFIX + hex.EncodeToString(addr.Bytes())
}

func GetUserAddressFromStreamIdBytes(inStreamId []byte) (common.Address, error) {
	streamId, err := StreamIdFromBytes(inStreamId)
	if err != nil {
		return common.Address{}, err
	}
	return GetUserAddrFromStreamId(streamId)
}

func GetUserAddrFromStreamId(streamId StreamId) (common.Address, error) {
	prefix := streamId.Type()
	if prefix != STREAM_USER_BIN &&
		prefix != STREAM_USER_DEVICE_KEY_BIN &&
		prefix != STREAM_USER_INBOX_BIN &&
		prefix != STREAM_USER_SETTINGS_BIN {
		return common.Address{}, RiverError(Err_BAD_STREAM_ID, "invalid stream type for getting user", "streamId", streamId)
	}
	return common.BytesToAddress(streamId.Bytes()[1:21]), nil
}

func GetUserAddressFromStreamId(s string) (common.Address, error) {
	streamId, err := StreamIdFromString(s)
	if err != nil {
		return common.Address{}, err
	}
	return GetUserAddrFromStreamId(streamId)
}

func GetUserAddressStringFromStreamId(streamId string) (string, error) {
	addr, err := GetUserAddressFromStreamId(streamId)
	if err != nil {
		return "", err
	}
	return addr.Hex(), nil
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

func ValidSpaceStreamId(streamId *StreamId) bool {
	return streamId.Type() == STREAM_SPACE_BIN
}

func ValidChannelStreamIdBytes(streamId []byte) bool {
	id, err := StreamIdFromBytes(streamId)
	if err != nil {
		return false
	}
	return ValidChannelStreamId(&id)
}

func ValidChannelStreamId(streamId *StreamId) bool {
	return streamId.Type() == STREAM_CHANNEL_BIN
}

func ValidDMChannelStreamIdBytes(streamId []byte) bool {
	id, err := StreamIdFromBytes(streamId)
	if err != nil {
		return false
	}
	return ValidDMChannelStreamId(&id)
}

func ValidDMChannelStreamId(streamId *StreamId) bool {
	return streamId.Type() == STREAM_DM_CHANNEL_BIN
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

func ValidGDMChannelStreamIdBytes(streamId []byte) bool {
	id, err := StreamIdFromBytes(streamId)
	if err != nil {
		return false
	}
	return ValidGDMChannelStreamId(&id)
}

func ValidGDMChannelStreamId(streamId *StreamId) bool {
	return streamId.Type() == STREAM_GDM_CHANNEL_BIN
}
