package main

// This Go program is designed to manage the complexities that arise when
// multiple Ethereum smart contracts depend on a common struct. In such
// scenarios, duplications of struct definitions can occur, especially when
// the contract bindings for all contracts are placed within the same package.
// The program automates the removal of these duplicate struct definitions.
//
// The main functionality involves parsing a Go source file to identify and
// remove specified struct definitions. It takes two command line arguments:
// the path to the Go file and a comma-separated list of struct names to be removed.
// The program carefully scans the source file, filters out the specified structs,
// and their associated comments, thus ensuring the cleanliness and maintainability
// of the codebase when dealing with multiple contract bindings.

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"strings"
)

func main() {
	// Check for command line arguments
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run script.go <filename> <structs-to-remove>")
		os.Exit(1)
	}

	// Get the file path from the command line arguments
	filePath := os.Args[1]

	// Parse the list of structs to remove from the command line
	structNames := strings.Split(os.Args[2], ",")
	structsToRemove := make(map[string]bool)
	for _, name := range structNames {
		structsToRemove[name] = true
	}

	// Parse the Go file
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		panic(err)
	}

	// Filter out the structs and their associated comments
	var newDecls []ast.Decl
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.TYPE {
			newDecls = append(newDecls, decl)
			continue
		}

		found := false
		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if ok {
				if _, exists := structsToRemove[typeSpec.Name.Name]; exists {
					found = true
					break
				}
			}
		}

		if !found {
			newDecls = append(newDecls, genDecl)
		}
	}
	file.Decls = newDecls

	// Remove comments containing struct names
	var newComments []*ast.CommentGroup
	for _, c := range file.Comments {
		includeCommentGroup := true
		for _, comment := range c.List {
			for structName := range structsToRemove {
				if strings.Contains(comment.Text, structName) {
					includeCommentGroup = false
					break
				}
			}
			if !includeCommentGroup {
				break
			}
		}
		if includeCommentGroup {
			newComments = append(newComments, c)
		}
	}
	file.Comments = newComments

	// Write the modified AST back to a file
	outputFile, err := os.Create(filePath)
	if err != nil {
		panic(err)
	}
	defer outputFile.Close()
	err = printer.Fprint(outputFile, fset, file)
	if err != nil {
		panic(err)
	}
}
