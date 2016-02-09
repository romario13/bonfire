package main

import (
	"io/ioutil"
	"os"
	"strings"
	"fmt"
)

// Reads all .txt files in the current folder
// and encodes them as strings literals in textfiles.go
func main() {
	out, _ := os.Create("textfiles.go")

	fmt.Fprintf(out, "package main \n\nconst (\n")

	readedBytes, _ := ioutil.ReadFile("html/inline/index.html")
	value := strings.Replace(string(readedBytes), "\n", " ", -1)

	startId := strings.Index(value, "id=\"data\">var data=") + 19;
	endId := strings.LastIndex(value, "]]]};</script>") + 4

	fmt.Fprintf(out, "htmlStart = %q\n", value[:startId])
	fmt.Fprintf(out, "htmlEnd = %q\n", value[endId:])

	fmt.Fprintf(out, ")\n")
}
