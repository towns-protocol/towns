package dlog

const (
	// Data types.
	ColorMap_BoolTrue int = iota
	ColorMap_BoolFalse
	ColorMap_Int
	ColorMap_Float
	ColorMap_String
	ColorMap_Hex
	ColorMap_Key
	ColorMap_FieldName
	ColorMap_Brace
	ColorMap_Colon
	ColorMap_Nil
	ColorMap_ErrorText

	// Log constructs.
	ColorMap_Level_Debug
	ColorMap_Level_Info
	ColorMap_Level_Warn
	ColorMap_Level_Error
	ColorMap_Time
	ColorMap_Message
	ColorMap_LogFieldKey

	ColorMap_Length // Must be last.
)

type ColorMap []ColorCode

var ColorMap_Enabled ColorMap = func() ColorMap {
	c := make(ColorMap, ColorMap_Length)
	c[ColorMap_BoolTrue] = FgGreen
	c[ColorMap_BoolFalse] = FgRed
	c[ColorMap_Int] = FgHiGreen
	c[ColorMap_Float] = FgHiRed
	c[ColorMap_String] = FgHiBlue
	c[ColorMap_Hex] = FgHiMagenta
	c[ColorMap_Key] = FgHiYellow
	c[ColorMap_FieldName] = FgHiWhite
	c[ColorMap_Brace] = FgHiCyan
	c[ColorMap_Colon] = FgHiCyan
	c[ColorMap_Nil] = FgMagenta
	c[ColorMap_ErrorText] = FgHiRed
	c[ColorMap_Level_Debug] = FgHiGreen
	c[ColorMap_Level_Info] = FgHiBlue
	c[ColorMap_Level_Warn] = FgHiYellow
	c[ColorMap_Level_Error] = FgHiRed
	c[ColorMap_Time] = FgHiCyan
	c[ColorMap_Message] = FgHiWhite
	c[ColorMap_LogFieldKey] = FgHiBlack
	return c
}()

var ColorMap_Disabled ColorMap = make([]ColorCode, ColorMap_Length)

var ColorMap_Default ColorMap = ColorMap_Enabled
