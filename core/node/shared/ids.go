package shared

import (
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"slices"
	"strings"

	"github.com/cespare/xxhash/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
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

func AddressFromSpaceId(spaceId StreamId) (common.Address, error) {
	if spaceId.Type() != STREAM_SPACE_BIN {
		return common.Address{}, RiverError(
			Err_BAD_STREAM_ID,
			"invalid stream type for getting space",
			"streamId",
			spaceId,
		)
	}
	return common.BytesToAddress(spaceId[1:21]), nil
}

func SpaceIdFromBytes(bytes []byte) (StreamId, error) {
	if len(bytes) != 20 {
		return StreamId{}, RiverError(Err_BAD_ADDRESS, "wrong length", "bytes", len(bytes))
	}
	address := common.BytesToAddress(bytes)
	return SpaceIdFromAddress(address), nil
}

func SpaceIdFromAddress(address common.Address) StreamId {
	var b StreamId
	b[0] = STREAM_SPACE_BIN
	copy(b[1:], address.Bytes())
	return b
}

func MakeSpaceId() (StreamId, error) {
	var b [32]byte
	b[0] = STREAM_SPACE_BIN
	_, err := rand.Read(b[1:21])
	if err != nil {
		return StreamId{}, RiverError(Err_INTERNAL, "failed to create random bytes", "error", err)
	}
	return StreamIdFromBytes(b[:])
}

func MakeChannelId(spaceId StreamId) (StreamId, error) {
	// replace the first byte with the channel type
	// copy the 20 bytes of the spaceId address
	// fill the rest with random bytes
	b, err := makeChannelIdPrefixBytes(spaceId)
	if err != nil {
		return StreamId{}, err
	}
	_, err = rand.Read(b[21:])
	if err != nil {
		return StreamId{}, RiverError(Err_INTERNAL, "failed to create random bytes", "error", err)
	}
	return StreamIdFromBytes(b[:])
}

func makeChannelIdPrefixBytes(spaceId StreamId) (StreamId, error) {
	// replace the first byte with the channel type
	// copy the 20 bytes of the spaceId address
	// leave the rest unwritten, which defaults to zeroes
	if spaceId.Type() != STREAM_SPACE_BIN {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid stream type for space", "streamId", spaceId)
	}
	var b [32]byte
	b[0] = STREAM_CHANNEL_BIN
	copy(b[1:], spaceId[1:21])
	return StreamIdFromBytes(b[:])
}

func MakeDefaultChannelId(spaceId StreamId) (StreamId, error) {
	bytes, err := makeChannelIdPrefixBytes(spaceId)
	if err != nil {
		return StreamId{}, err
	}
	return StreamIdFromBytes(bytes[:])
}

func IsDefaultChannelId(channelId StreamId) bool {
	if channelId.Type() != STREAM_CHANNEL_BIN {
		return false
	}
	return bytes.Equal(channelId[21:], make([]byte, 11))
}

func UserStreamIdFromBytes(addr []byte) (StreamId, error) {
	if len(addr) == 20 {
		return UserStreamIdFromAddr(common.BytesToAddress(addr)), nil
	}

	return StreamId{}, RiverError(
		Err_BAD_ADDRESS,
		"Bad address bytes",
		"address", fmt.Sprintf("%x", addr),
	).Func("UserStreamIdFromBytes")
}

func UserStreamIdFromAddr(addr common.Address) StreamId {
	var b StreamId
	b[0] = STREAM_USER_BIN
	copy(b[1:], addr.Bytes())
	return b
}

func UserSettingStreamIdFromAddr(addr common.Address) StreamId {
	var b StreamId
	b[0] = STREAM_USER_SETTINGS_BIN
	copy(b[1:], addr.Bytes())
	return b
}

func UserMetadataStreamIdFromAddress(addr common.Address) StreamId {
	var b StreamId
	b[0] = STREAM_USER_METADATA_KEY_BIN
	copy(b[1:], addr.Bytes())
	return b
}

func UserInboxStreamIdFromAddress(addr common.Address) StreamId {
	var b StreamId
	b[0] = STREAM_USER_INBOX_BIN
	copy(b[1:], addr.Bytes())
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
		prefix != STREAM_USER_METADATA_KEY_BIN &&
		prefix != STREAM_USER_INBOX_BIN &&
		prefix != STREAM_USER_SETTINGS_BIN {
		return common.Address{}, RiverError(
			Err_BAD_STREAM_ID,
			"invalid stream type for getting user",
			"streamId",
			streamId,
		)
	}
	return common.BytesToAddress(streamId[1:21]), nil
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

func ValidSpaceStreamIdBytes(streamId []byte) bool {
	id, err := StreamIdFromBytes(streamId)
	if err != nil {
		return false
	}
	return ValidSpaceStreamId(&id)
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
	s[0] = STREAM_DM_CHANNEL_BIN
	copy(s[1:], hash[:31])
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

func ValidUserIdBytes(userId []byte) bool {
	return len(userId) == 20
}

func ShardFromMetadataStreamId(streamId StreamId) (uint64, error) {
	if streamId.Type() != STREAM_METADATA_BIN {
		return 0, RiverError(Err_BAD_STREAM_ID, "invalid stream type for metadata", "streamId", streamId)
	}
	// 1 byte prefix, 8 byte big endian shard number
	return binary.BigEndian.Uint64(streamId[1:9]), nil
}

func MetadataStreamIdFromShard(shard uint64) StreamId {
	var b StreamId
	b[0] = STREAM_METADATA_BIN
	binary.BigEndian.PutUint64(b[1:9], shard)
	return b
}

func ShardForStreamId(streamId StreamId, shardMask uint64) uint64 {
	hash := xxhash.Sum64(streamId[:])
	shard := hash & shardMask
	return shard
}

func MetadataStreamIdForStreamId(streamId StreamId, shard uint64) StreamId {
	return MetadataStreamIdFromShard(ShardForStreamId(streamId, shard))
}
