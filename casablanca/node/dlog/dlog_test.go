package dlog_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/river-build/river/dlog"

	"log/slog"
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
