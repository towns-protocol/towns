package storage

import (
	"testing"
)

func TestMigrateExistingDb(t *testing.T) {
	_, _, c1, _ := setupTest(t)
	c1()
	_, _, c2, _ := setupTest(t)
	c2()
}
