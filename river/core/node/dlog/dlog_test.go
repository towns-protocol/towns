package dlog_test

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/dlog"
	"github.com/stretchr/testify/assert"
)

type Data2 struct {
	Num       int
	Nums      []int
	Str       string
	Bytes     []byte
	MoreData  *Data2
	Map       map[string]string
	ByteMap   map[string][]byte
	DataMap   map[string]*Data2
	Bool      bool
	AndFalse  bool
	Enternity time.Duration
	EmptyStr  string
}

func makeTestData2() *Data2 {
	return &Data2{
		Num:   1,
		Nums:  []int{1, 2, 3, 4, 5},
		Str:   "hello",
		Bytes: []byte("world hello"),
		MoreData: &Data2{
			Num:   2,
			Bytes: []byte("hello hello hello"),
			Map:   map[string]string{"hello": "world"},
		},
		Map: map[string]string{
			"aabbccdd":               "00112233445566778899",
			"0x00112233445566778899": "hello",
			"hello2":                 "world2",
			"world2":                 "hello2",
			"hello3":                 "world3",
			"world3":                 "hello3",
			"hello4":                 "world4",
			"world4":                 "hello4",
			"xx_empty":               "",
		},
		ByteMap:   map[string][]byte{"hello": []byte("world")},
		DataMap:   map[string]*Data2{"hello": {Num: 3}},
		Bool:      true,
		AndFalse:  false,
		Enternity: time.Hour,
	}
}

func TestDlog(t *testing.T) {
	log := slog.New(dlog.NewPrettyTextHandler(os.Stderr, &dlog.PrettyHandlerOptions{
		AddSource:   false,
		ReplaceAttr: nil,
	}))

	data := makeTestData2()

	log.Error("Error example", "int", 33, "data", data, "str", "hello", "bytes", []byte("world"))
	fmt.Println()

	log.WithGroup("group").With("with1", 1, "with2", 2).Info("TestSlog", "data", data, "int", 22)
	fmt.Println()

	log.Info("simple type examples",
		"hex_bytes", []byte{0x01, 0x02, 0x03, 0x04, 0x05},
		"long bytes", []byte("hello world"),
		"string", "hello world",
		"int", 33,
		"bool_true", true,
		"bool_false", false,
		"nil", nil,
		"float", 3.14,
		"duration", time.Minute,
	)
	fmt.Println()
}

type byteArray [10]byte

func TestByteType(t *testing.T) {
	assert := assert.New(t)

	buf := &bytes.Buffer{}
	log := slog.New(
		dlog.NewPrettyTextHandler(
			buf,
			&dlog.PrettyHandlerOptions{Colors: dlog.ColorMap_Disabled, DisableShortHex: true},
		),
	)

	b := byteArray{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	log.Info("byte array", "byte_array", b)
	assert.Contains(buf.String(), "0102030405060708090a")
}

func TestCommonAddress(t *testing.T) {
	assert := assert.New(t)

	buf := &bytes.Buffer{}
	log := slog.New(
		dlog.NewPrettyTextHandler(
			buf,
			&dlog.PrettyHandlerOptions{Colors: dlog.ColorMap_Disabled, DisableShortHex: true},
		),
	)

	b := common.Address{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	log.Info("byte array", "byte_array", b)
	assert.Contains(buf.String(), "0102030405060708090a00000000000000000000")
}

func TestMapWithCommonAddress(t *testing.T) {
	assert := assert.New(t)

	buf := &bytes.Buffer{}
	log := slog.New(
		dlog.NewPrettyTextHandler(
			buf,
			&dlog.PrettyHandlerOptions{Colors: dlog.ColorMap_Disabled, DisableShortHex: true},
		),
	)

	mm := map[common.Address]string{
		{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}:          "hello",
		{11, 12, 13, 14, 15, 16, 17, 18, 19, 20}: "world",
	}
	log.Info("byte array", "map", mm)
	assert.Contains(buf.String(), "0102030405060708090a00000000000000000000")
	assert.Contains(buf.String(), "0b0c0d0e0f101112131400000000000000000000")
	assert.Contains(buf.String(), "hello")
	assert.Contains(buf.String(), "world")
}

func bytesFromHex(s string) []byte {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return b
}

func TestShortHex(t *testing.T) {
	assert := assert.New(t)

	buf := &bytes.Buffer{}
	log := slog.New(
		dlog.NewPrettyTextHandler(
			buf,
			&dlog.PrettyHandlerOptions{Colors: dlog.ColorMap_Disabled, DisableShortHex: false},
		),
	)

	type testParams struct {
		arg      any
		expected string
	}

	tests := []testParams{
		{"00112233445566778899", "00112233445566778899"},
		{"0x00112233445566778899", "0x00112233445566778899"},
		{"0011223344556677889900112233445566778899", "0011223344556677889900112233445566778899"},
		{"0x0011223344556677889900112233445566778899", "0x0011223344556677889900112233445566778899"},
		{"0011223344556677889900112233445566778899aa", "001122334455667788..2233445566778899aa"},
		{"0x0011223344556677889900112233445566778899aa", "0x001122334455667788..2233445566778899aa"},
		{bytesFromHex("00112233445566778899"), "00112233445566778899"},
		{bytesFromHex("0011223344556677889900112233445566778899"), "0011223344556677889900112233445566778899"},
		{bytesFromHex("0011223344556677889900112233445566778899aa"), "001122334455667788..2233445566778899aa"},
	}
	for _, test := range tests {
		buf.Reset()
		log.Info("test", "hex", test.arg)
		assert.Contains(buf.String(), test.expected, "arg: %v", test.arg)
	}
}
