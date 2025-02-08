package logging_test

import (
	"encoding/hex"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

type Data2 struct {
	Num      int
	Nums     []int
	Str      string
	Bytes    []byte
	MoreData *Data2
	Map      map[string]string
	ByteMap  map[string][]byte
	DataMap  map[string]*Data2
	Bool     bool
	AndFalse bool
	Eternity time.Duration
	EmptyStr string
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
		ByteMap:  map[string][]byte{"hello": []byte("world")},
		DataMap:  map[string]*Data2{"hello": {Num: 3}},
		Bool:     true,
		AndFalse: false,
		Eternity: time.Hour,
	}
}

func TestZap(t *testing.T) {
	log, buf := testutils.ZapJsonLogger()

	data := makeTestData2()

	log.Errorw("Error example", "int", 33, "data", data, "str", "hello", "bytes", []byte("world"))
	log.Named("group").With("with1", 1, "with2", 2).Infow("TestZap", "data", data, "int", 22)
	log.Infow(
		"simple type examples",
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
	require.NoError(t, log.Sync())

	if testfmt.Enabled() {
		fmt.Print(buf.String())
		fmt.Println()
	}

	logOutput := testutils.RemoveJsonTimestamp(buf.String())
	// Uncomment to write file
	// os.WriteFile("testdata/zap.txt", []byte(logOutput), 0644)

	expectedBytes, err := os.ReadFile("testdata/zap.txt")
	require.NoError(t, err)
	expected := string(expectedBytes[:])

	// Compare the output with the expected output
	require.Equal(t, expected, logOutput)
}

type byteArray [10]byte

func TestByteType(t *testing.T) {
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	b := byteArray{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	log.Infow("byte array", "byte_array", b)
	assert.Contains(buf.String(), "0102030405060708090a")
}

func TestByteArrayType(t *testing.T) {
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	b := [12]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	log.Infow("byte array", "byte_array", b)
	assert.Contains(buf.String(), "0102030405060708090a0b0c")
}

func TestNestedBytes(t *testing.T) {
	// Just to have a record: the zap json encoder uses go's json encoder
	// for structs, which encodes byte arrays and slices as lists of uint8s
	// and b64 encoded strings, respectively. This test is failing, but we
	// have not yet decided how to handle these cases.
	t.SkipNow()
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	type testStruct struct {
		A [12]byte
		C []byte
	}
	b := testStruct{
		A: [12]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12},
		C: []byte("def"),
	}
	log.Infow("nested byte array", "b", b)
	assert.Contains(buf.String(), "0102030405060708090a0b0c")
	assert.Contains(buf.String(), hex.EncodeToString([]byte("def")))
}

func TestByteSliceType(t *testing.T) {
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	log.Infow("byte slice", "byte_slice", []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, "slice2", bytesFromHex("0d0e0f"))
	assert.Contains(buf.String(), "0102030405060708090a")
	assert.Contains(buf.String(), "0d0e0f")
}

func TestCommonAddress(t *testing.T) {
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	b := common.Address{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	log.Infow("byte array", "byte_array", b)
	assert.Contains(buf.String(), "0102030405060708090A00000000000000000000")
}

func TestMapWithCommonAddress(t *testing.T) {
	assert := assert.New(t)

	log, buf := testutils.ZapJsonLogger()

	mm := map[common.Address]string{
		{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}:          "hello",
		{11, 12, 13, 14, 15, 16, 17, 18, 19, 20}: "world",
	}

	log.Infow("byte array", "map", mm)

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

	log, buf := testutils.ZapJsonLogger()

	type testParams struct {
		arg      any
		expected string
	}

	tests := []testParams{
		{"00112233445566778899", "00112233445566778899"},
		{"0x00112233445566778899", "0x00112233445566778899"},
		{
			"001122334455667788990011223344556677889900112233445566778899aabb",
			"001122334455667788990011223344556677889900112233445566778899aabb",
		},
		{
			"0x001122334455667788990011223344556677889900112233445566778899aabb",
			"0x001122334455667788990011223344556677889900112233445566778899aabb",
		},
		{
			"001122334455667788990011223344556677889900112233445566778899aabbcc",
			"001122334455667788990011223344..889900112233445566778899aabbcc",
		},
		{
			"0x001122334455667788990011223344556677889900112233445566778899aabbcc",
			"0x001122334455667788990011223344..889900112233445566778899aabbcc",
		},
		{bytesFromHex("00112233445566778899"), "00112233445566778899"},
		{
			bytesFromHex("001122334455667788990011223344556677889900112233445566778899aabb"),
			"001122334455667788990011223344556677889900112233445566778899aabb",
		},
		{
			bytesFromHex("001122334455667788990011223344556677889900112233445566778899aabbcc"),
			"001122334455667788990011223344..889900112233445566778899aabbcc",
		},
	}
	for _, test := range tests {
		buf.Reset()
		log.Infow("test", "hex", test.arg)
		assert.Contains(buf.String(), test.expected, "arg: %v", test.arg)
	}
}

func TestLogProtoWithBinaryStrings(t *testing.T) {
	t.Skip("TODO - implement sane proto serialization in zap")
	// The byte string here will render as b64, which is fine. It's a proto.
	envelope := &Envelope{
		Hash: []byte("2346ad27d7568ba9896f1b7da6b5991251debdf2"),
	}

	// Create a new logging logger that logs to a temp file in JSON format
	logger, buffer := testutils.ZapJsonLogger()

	logger.Infow("Logging envelope", "envelope", envelope)

	logOutput := testutils.RemoveJsonTimestamp(buffer.String())
	// Uncomment to write file
	// os.WriteFile("testdata/envelope_json.txt", []byte(logOutput), 0644)

	expectedBytes, err := os.ReadFile("testdata/envelope_json.txt")
	require.NoError(t, err)
	expected := string(expectedBytes[:])

	// Compare the output with the expected output
	require.Equal(t, expected, logOutput)
}

func TestLogRiverError(t *testing.T) {
	riverErr := base.AsRiverError(fmt.Errorf("test"), Err_DB_OPERATION_FAILURE).
		Message("this is the error message").
		Tag("tagA", "a").
		Tag("tagB", "b").
		Func("firstFunction").
		Func("secondFunction")

	// Create a new logging logger that logs to a temp file in JSON format
	logger, buffer := testutils.ZapJsonLogger()

	logger.Infow("Logging river error", "river_error", riverErr)

	logOutput := testutils.RemoveJsonTimestamp(buffer.String())
	// Uncomment to write file
	// os.WriteFile("testdata/river_error_json.txt", []byte(logOutput), 0644)

	expectedBytes, err := os.ReadFile("testdata/river_error_json.txt")
	require.NoError(t, err)
	expected := string(expectedBytes[:])

	// Compare the output with the expected output
	require.Equal(t, expected, logOutput)

	// Test again with the error's inbuilt logging.
	logger, buffer = testutils.ZapJsonLogger()
	_ = riverErr.LogWithLevel(logger, zapcore.InfoLevel)

	// Validate that the LogInfo method produces sane output. The output here
	// is a bit different because we are able to add tags as fields to the log
	// object and use the error message as the log message directly.
	logOutput = testutils.RemoveJsonTimestamp(buffer.String())
	// Uncomment to write file
	// os.WriteFile("testdata/river_error_log_with_level_json.txt", []byte(logOutput), 0644)

	expectedBytes, err = os.ReadFile("testdata/river_error_log_with_level_json.txt")
	expected = string(expectedBytes[:])
	require.NoError(t, err)
	require.Equal(t, expected, logOutput)
}
