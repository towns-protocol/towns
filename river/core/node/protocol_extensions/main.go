package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// Wrap os.File to add a WriteString2 method that prints errors to stdout.
type FileHelper struct {
	*os.File
}

// WriteString returns an error. WriteString2 prints the error to stdout.
func (f *FileHelper) WriteString2(s string) {
	_, err := f.WriteString(s)
	if err != nil {
		fmt.Println("Error writing to output file:", err)
	}
}

// Parse the protocol file and generate a new file with custom extensions.
func main() {
	inputFileName := "../protocol/protocol.pb.go"
	outputFileName := "../protocol/extensions.pb.go"
	printAllStructs := false

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, inputFileName, nil, parser.ParseComments)
	if err != nil {
		fmt.Println("Error parsing file:", err)
		return
	}

	var oneOfTypes []string
	var inceptionTypes []string
	var allStructs []string
	ast.Inspect(file, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					typeSpec := spec.(*ast.TypeSpec)
					if structType, ok := typeSpec.Type.(*ast.StructType); ok {
						allStructs = append(allStructs, typeSpec.Name.Name)
						if strings.HasSuffix(typeSpec.Name.Name, "_Inception") {
							inceptionTypes = append(inceptionTypes, typeSpec.Name.Name)
						}
						for _, field := range structType.Fields.List {
							fieldType, ok := field.Type.(*ast.Ident)
							if ok {
								if field.Tag != nil && strings.Contains(field.Tag.Value, "protobuf_oneof") {
									oneOfTypes = append(oneOfTypes, fieldType.Name)
									allStructs = append(allStructs, fmt.Sprintf("	/* tag:%s */\n	/* comment:%s */\n	/* doc: \n %s	*/", field.Tag.Value, field.Comment.Text(), field.Doc.Text()))
								}
							}
							switch x := field.Type.(type) {
							case *ast.Ident:
								allStructs = append(allStructs, fmt.Sprintf("  %s %s", field.Names[0], x.Name))
							case *ast.SelectorExpr:
								if !strings.Contains(fmt.Sprintf("%s", x.X), "protoimpl") {
									allStructs = append(allStructs, fmt.Sprintf("  %s %s.%s", field.Names[0], x.X, x.Sel.Name))
								}
							case *ast.StarExpr:
								allStructs = append(allStructs, fmt.Sprintf("  %s *%s", field.Names[0], x.X))
							case *ast.ArrayType:
								allStructs = append(allStructs, fmt.Sprintf("  %s []%s", field.Names[0], x.Elt))
							case *ast.MapType:
								allStructs = append(allStructs, fmt.Sprintf("  %s map[%s]%s", field.Names[0], x.Key, x.Value))
							default:
								allStructs = append(allStructs, fmt.Sprintf("  not found======%s %s", field.Names[0], x))
							}

						}
					}
				}
			}
		}
		return true
	})

	outputFileF, err := os.Create(outputFileName)
	outputFile := &FileHelper{outputFileF}
	if err != nil {
		fmt.Println("Error creating output file:", err)
		return
	}
	defer outputFile.Close()

	packageName := file.Name.Name
	outputFile.WriteString2(fmt.Sprintf("package %s\n\n", packageName))
	outputFile.WriteString2("import \"fmt\"\n\n")

	caser := cases.Title(language.English, cases.NoLower)
	for _, oneOfTypeName := range oneOfTypes {
		exportedTypeName := caser.String(oneOfTypeName)
		outputFile.WriteString2(fmt.Sprintf("type %s = %s\n", exportedTypeName, oneOfTypeName))
	}

	// inceptions
	genInceptionPayloadImpl(inceptionTypes, outputFile)

	if printAllStructs {
		for _, structName := range allStructs {
			outputFile.WriteString2(fmt.Sprintf("// %s \n", structName))
		}
	}

	fmt.Println("Generated custom extensions in file:", outputFileName)
}

func genInceptionPayloadImpl(inceptionTypes []string, outputFile *FileHelper) {
	// the header defines the IsInceptionPayload interface
	header := func() string {
		return `
type IsInceptionPayload interface {
	isInceptionPayload()
	GetStreamId() []byte
	GetSettings() *StreamSettings
}`
	}

	// conformance ensures that all inception types implement the IsInceptionPayload interface
	conformance := func() string {
		return `
func (*%s) isInceptionPayload() {}`
	}

	// snapshot getter allows us to get the inception payload from a snapshot
	snapshotGetterStart := func() string {
		return `

func (e *Snapshot) GetInceptionPayload() IsInceptionPayload {
	switch e.Content.(type) {`
	}
	snapshotGetterCase := func() string {
		return `
	case *Snapshot_%s:
		r := e.Content.(*Snapshot_%s).%s.GetInception()
		if r == nil {
			return nil
		}
		return r`
	}

	// stream event getter allows us to get the inception payload from a stream event
	streamEventGetterStart := func() string {
		return `

func (e *StreamEvent) GetInceptionPayload() IsInceptionPayload {
	switch e.Payload.(type) {`
	}
	streamEventGetterCase := func() string {
		return `
	case *StreamEvent_%s:
		r := e.Payload.(*StreamEvent_%s).%s.GetInception()
		if r == nil {
			return nil
		}
		return r`
	}
	getterEnd := func() string {
		return `
	default:
		return nil
	}
}`
	}

	// validator ensures that the inception payload type matches the stream type
	validatorStart := func() string {
		return `

func (e *StreamEvent) VerifyPayloadTypeMatchesStreamType(i IsInceptionPayload) error {
	switch e.Payload.(type) {`
	}
	validatorCase := func() string {
		return `
	case *StreamEvent_%s:
		_, ok := i.(*%s_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_%s::%%T vs %%T", e.Get%s().Content, i)
		}`
	}
	validatorEnd := func() string {
		return `
	case *StreamEvent_MemberPayload:
		return nil
	default:
		return fmt.Errorf("inception type type not handled: %T vs %T", e.Payload, i)
	}
	return nil
}
`
	}

	outputFile.WriteString2(header())
	for _, inceptionTypeName := range inceptionTypes {
		outputFile.WriteString2(fmt.Sprintf(conformance(), inceptionTypeName))
	}

	outputFile.WriteString2(snapshotGetterStart())
	for _, inceptionTypeName := range inceptionTypes {
		inceptionTypeBase := strings.Split(inceptionTypeName, "_")[0]
		inceptionTypeBase = strings.Replace(inceptionTypeBase, "Payload", "Content", 1)
		outputFile.WriteString2(fmt.Sprintf(snapshotGetterCase(), inceptionTypeBase, inceptionTypeBase, inceptionTypeBase))
	}
	outputFile.WriteString2(getterEnd())

	outputFile.WriteString2(streamEventGetterStart())
	for _, inceptionTypeName := range inceptionTypes {
		inceptionTypeBase := strings.Split(inceptionTypeName, "_")[0]
		outputFile.WriteString2(fmt.Sprintf(streamEventGetterCase(), inceptionTypeBase, inceptionTypeBase, inceptionTypeBase))
	}
	outputFile.WriteString2(getterEnd())

	outputFile.WriteString2(validatorStart())
	for _, inceptionTypeName := range inceptionTypes {
		inceptionTypeBase := strings.Split(inceptionTypeName, "_")[0]
		outputFile.WriteString2(
			fmt.Sprintf(validatorCase(), inceptionTypeBase, inceptionTypeBase, inceptionTypeBase, inceptionTypeBase),
		)
	}
	outputFile.WriteString2(validatorEnd())
}
