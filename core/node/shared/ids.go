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

func UserStreamIdFromId(id string) (StreamId, error) {
	if !common.IsHexAddress(id) {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid id", "id", id)
	}
	id = strings.TrimPrefix(id, "0x")
	return StreamIdFromString(STREAM_USER_PREFIX + strings.ToLower(id))
}

func UserDeviceKeyStreamIdFromAddress(addr common.Address) StreamId {
	var b StreamId
	b.bytes[0] = STREAM_USER_DEVICE_KEY_BIN
	copy(b.bytes[1:], addr.Bytes())
	return b
}

func GetUserAddressFromStreamIdBytes(inStreamId []byte) (common.Address, error) {
	streamId, err := StreamIdFromBytes(inStreamId)
	if err != nil {
		return common.Address{}, err
	}
	return GetUserAddressFromStreamId(streamId)
}

func GetUserAddressFromStreamId(streamId StreamId) (common.Address, error) {
	prefix := streamId.Type()
	if prefix != STREAM_USER_BIN &&
		prefix != STREAM_USER_DEVICE_KEY_BIN &&
		prefix != STREAM_USER_INBOX_BIN &&
		prefix != STREAM_USER_SETTINGS_BIN {
		return common.Address{}, RiverError(Err_BAD_STREAM_ID, "invalid stream type for getting user", "streamId", streamId)
	}
	return common.BytesToAddress(streamId.Bytes()[1:21]), nil
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

func DMStreamIdForUsers(a []byte, b []byte) (StreamId, error) {
	// Lowercase the user ids, sort them and join them with a dash
	addressUserA, err := AddressHex(a)
	if err != nil {
		return StreamId{}, err
	}
	addressUserB, err := AddressHex(b)
	if err != nil {
		return StreamId{}, err
	}

	ids := []string{strings.ToLower(addressUserA), strings.ToLower(addressUserB)}
	slices.Sort(ids)
	joined := strings.Join(ids, "-")
	hash := crypto.Keccak256([]byte(joined))

	var s StreamId
	s.bytes[0] = STREAM_DM_CHANNEL_BIN
	copy(s.bytes[1:], hash[:31])
	return s, nil
}

func ValidDMChannelStreamIdBetween(id StreamId, userIdA []byte, userIdB []byte) bool {
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
