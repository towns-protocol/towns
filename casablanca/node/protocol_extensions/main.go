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

func main() {
	inputFileName := "../protocol/protocol.pb.go"
	outputFileName := "../protocol/extensions.pb.go"

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, inputFileName, nil, parser.ParseComments)
	if err != nil {
		fmt.Println("Error parsing file:", err)
		return
	}

	var oneOfTypes []string
	ast.Inspect(file, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					typeSpec := spec.(*ast.TypeSpec)
					if structType, ok := typeSpec.Type.(*ast.StructType); ok {
						for _, field := range structType.Fields.List {
							if field.Tag != nil && strings.Contains(field.Tag.Value, "protobuf_oneof") {
								fieldType, ok := field.Type.(*ast.Ident)
								if ok {
									oneOfTypes = append(oneOfTypes, fieldType.Name)
								}
							}
						}
					}
				}
			}
		}
		return true
	})

	outputFile, err := os.Create(outputFileName)
	if err != nil {
		fmt.Println("Error creating output file:", err)
		return
	}
	defer outputFile.Close()

	packageName := file.Name.Name
	_, err2 := outputFile.WriteString(fmt.Sprintf("package %s\n\n", packageName))
	if err2 != nil {
		fmt.Println("Error writing to output file:", err2)
	}

	caser := cases.Title(language.English, cases.NoLower)
	for _, oneOfTypeName := range oneOfTypes {
		exportedTypeName := caser.String(oneOfTypeName)
		_, err3 := outputFile.WriteString(fmt.Sprintf("type %s = %s\n", exportedTypeName, oneOfTypeName))
		if err3 != nil {
			fmt.Println("Error writing to output file:", err3)
		}
	}

	fmt.Println("Generated custom extensions in file:", outputFileName)
}
