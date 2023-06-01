package common

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
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
	return "00-" + userId, nil
}

func ValidUserStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, "00-0x")
}

func ValidUserDeviceKeyStreamId(id string) bool {
	return len(id) == 45 && strings.HasPrefix(id, "33-0x")
}

func UserDeviceKeyStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", fmt.Errorf("invalid id length %s", id)
	}
	return "33-" + id, nil
}

func UserStreamIdFromId(id string) (string, error) {
	if len(id) != 42 {
		return "", fmt.Errorf("invalid id length %s", id)
	}
	return "00-" + id, nil
}

func AddressFromUserStreamId(id string) ([]byte, error) {
	if len(id) != 42 {
		return nil, fmt.Errorf("invalid id length %s", id)
	}
	if !strings.HasPrefix(id, "00-") {
		return nil, fmt.Errorf("invalid id %s", id)
	}
	return AddressFromUserId(id[3:])
}

func SpaceStreamIdFromName(space string) string {
	return "11-" + space
}

func ChannelStreamIdFromName(channel string) string {
	return "22-" + channel
}

func ValidSpaceStreamId(id string) bool {
	return strings.HasPrefix(id, "11-")
}

func ValidChannelStreamId(id string) bool {
	return strings.HasPrefix(id, "22-")
}

func RoomTypeFromStreamId(id string) (RoomType, error) {
	if ValidSpaceStreamId(id) {
		return Space, nil
	} else if ValidChannelStreamId(id) {
		return Channel, nil
	} else  if ValidUserStreamId(id) {
		return User, nil
	}
	return InvalidRoomType, fmt.Errorf("invalid room type for stream id %s", id)
}
