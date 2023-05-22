package base

import (
	"os"
	"strings"
)

func isOn(val string) bool {
	val = strings.ToLower(val)
	return val == "1" || val == "true" || val == "yes" || val == "on" || val == "y"
}

var debugCorruptionPrint = func() bool {
	return isOn(os.Getenv("DEBUG_CORRUPTION_PRINT"))
}()

var debugCorruptionExit = func() bool {
	return isOn(os.Getenv("DEBUG_CORRUPTION_EXIT"))
}()

func DebugCorruptionPrint() bool {
	return debugCorruptionPrint
}

func DebugCorruptionExit() bool {
	return debugCorruptionExit
}
