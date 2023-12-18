package nodes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCSV(t *testing.T) {
	csv := `#address,url
	0xda111744c29bF450d6D20BD10d383d17Fe8A8D70,http://localhost:8080
	0x363BD2327d249f178333A2CCC8bA6ccB715DBEb2,http://localhost:8081
	793bfbc421C71F19577F789A3398275f1b0125Ee,http://localhost:8082`

	registry, err := NewNodeRegistryFromCsv(context.Background(), csv, "0x793bFbc421C71F19577F789A3398275f1b0125Ee")
	assert.NoError(t, err)
	assert.Equal(t, 3, registry.NumNodes())

	n0 := registry.nodes["0xdA111744c29bF450d6D20BD10d383d17Fe8A8D70"]
	assert.NotNil(t, n0)
	assert.Equal(t, "0xdA111744c29bF450d6D20BD10d383d17Fe8A8D70", n0.address)
	assert.Equal(t, "http://localhost:8080", n0.url)
	assert.Equal(t, false, n0.local)

	n1 := registry.nodes["0x363BD2327d249f178333A2CCC8bA6ccB715DBEb2"]
	assert.NotNil(t, n1)
	assert.Equal(t, "0x363BD2327d249f178333A2CCC8bA6ccB715DBEb2", n1.address)
	assert.Equal(t, "http://localhost:8081", n1.url)
	assert.Equal(t, false, n1.local)

	n2 := registry.nodes["0x793bFbc421C71F19577F789A3398275f1b0125Ee"]
	assert.NotNil(t, n2)
	assert.Equal(t, "0x793bFbc421C71F19577F789A3398275f1b0125Ee", n2.address)
	assert.Equal(t, "http://localhost:8082", n2.url)
	assert.Equal(t, true, n2.local)
}
