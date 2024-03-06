package render

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"strings"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

// Execute renders the given data using its associated template
func Execute[RD RenderableData](data RD) (*bytes.Buffer, error) {
	var output bytes.Buffer
	if err := ExecuteAndWrite(data, &output); err != nil {
		return nil, err
	}
	return &output, nil
}

// ExecuteAndWrite Execute renders the given data and writes it to the given writer
func ExecuteAndWrite[RD RenderableData](data RD, into io.Writer) error {
	tmpl := templates[data.TemplateName()]
	if err := tmpl.Execute(into, data); err != nil {
		return AsRiverError(err, Err_INTERNAL).Message("unable to execute template").
			Tag("template", data.TemplateName()).
			Func("ExecuteAndWrite")
	}
	return nil
}

var (
	//go:embed templates
	files     embed.FS
	templates = make(map[string]*template.Template)
	helpers   = template.FuncMap{
		"safeDivide": func(a, b int64) string {
			if b == 0 {
				return "NA"
			}
			return fmt.Sprintf("%.1f", float64(a)/float64(b))
		},
		"intToInt64": func(i int) int64 {
			return int64(i)
		},
	}
)

func init() {
	err := fs.WalkDir(files, "templates", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() && strings.HasSuffix(path, ".template.html") {
			templateContents, err := files.ReadFile(path)
			if err != nil {
				panic(err)
			}
			pt, err := template.New(path).Funcs(helpers).Parse(string(templateContents))
			if err != nil {
				panic(fmt.Sprintf("unable to parse html template %s: %v", path, err))
			}
			templates[path] = pt
		}
		return nil
	})
	if err != nil {
		panic(err)
	}
}
