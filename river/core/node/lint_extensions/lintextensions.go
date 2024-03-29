package main

import (
	"go/ast"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/singlechecker"
)

var Analyzer = &analysis.Analyzer{
	Name: "lintextensions",
	Doc:  "reports calls to context.Background()",
	Run:  run,
}

func isIgnored(commentGroups []*ast.CommentGroup) bool {
	for _, group := range commentGroups {
		for _, comment := range group.List {
			if strings.Contains(comment.Text, "//lint:ignore") || strings.Contains(comment.Text, "// lint:ignore") {
				return true
			}
		}
	}
	return false
}

func run(pass *analysis.Pass) (interface{}, error) {
	var currentFuncDecl *ast.FuncDecl
	for _, file := range pass.Files {
		commentMap := ast.NewCommentMap(pass.Fset, file, file.Comments)
		ast.Inspect(file, func(n ast.Node) bool {
			method, ok := n.(*ast.FuncDecl)
			if ok {
				// aellis, by trial and error, this seems to be what maps to comments
				currentFuncDecl = method
			}

			callExpr, ok := n.(*ast.CallExpr)
			if !ok {
				return true // not a call expression
			}
			selExpr, ok := callExpr.Fun.(*ast.SelectorExpr)
			if !ok {
				return true // not a selector expression
			}
			ident, ok := selExpr.X.(*ast.Ident)
			if !ok {
				return true // not an identifier
			}

			if ident.Name == "context" && selExpr.Sel.Name == "Background" {
				cmap := commentMap.Filter(currentFuncDecl).Comments()
				// Check if this call expression is preceded by an ignore comment
				if isIgnored(cmap) {
					return true // Skip this node
				}
				pass.Reportf(
					callExpr.Pos(),
					"use of context.Background() is discouraged, use the default context instead",
				)
			}
			return true
		})
	}
	return nil, nil
}

func main() {
	singlechecker.Main(Analyzer)
}
