package main

import (
	"bufio"
	"os"
	"io"
	"fmt"
	"strings"
	"sort"
)

//go:generate go run html/inline/includetxt.go

type StackItem struct {
	value    int
	children map[int]*StackItem
}

func main() {

	in := bufio.NewReader(os.Stdin)
	processNameIndex := 0
	inStack := false
	rootItem := &StackItem{0, map[int]*StackItem{}}

	dict := make(map[string]int)
	dictIndex := 0;

	// add "root" to dictionary
	rootFunctionName := "root"
	addToDict(dict, &dictIndex, &rootFunctionName)

	var currentStack []int

	for {
		input, err := in.ReadString('\n')

		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}

		if (strings.Index(input, "#") == 0) {
			continue
		}

		if (!inStack) {

			// Remember processId

			inStack = true;
			pos := strings.Index(input, " ")
			processName := input[:pos]

			processNameIndex = addToDict(dict, &dictIndex, &processName)

		} else {

			// Collect all function names

			functionName := strings.TrimSpace(input)
			if len(functionName) != 0 {
				pos := strings.Index(functionName, " ")
				if (pos > -1) {
					functionName = functionName[pos:]
				}

				functionNameIndex := addToDict(dict, &dictIndex, &functionName)
				currentStack = append(currentStack, functionNameIndex)
			} else {

				// End of stack

				inStack = false;
				currentStack = append(currentStack, processNameIndex)

				// Add new stack to StackItems tree

				currentItem := rootItem
				currentItem.value ++

				for i := len(currentStack) - 1; i >= 0; i-- {
					stackFunction := currentStack[i]

					nextItem, ok := currentItem.children[stackFunction]
					if ok {
						nextItem.value ++
					} else {
						nextItem = &StackItem{1, map[int]*StackItem{}}
						currentItem.children[stackFunction] = nextItem
					}

					currentItem = nextItem
				}

				// clean stack
				currentStack = nil
			}
		}


	}

	indexMap := make(map[int]string)

	for functionName, functionId := range dict {
		indexMap[functionId] = functionName
	}


	fmt.Printf("%s{", htmlStart)
	printDictionary(indexMap)
	fmt.Printf(",")
	printFlame(rootItem, indexMap)
	fmt.Printf("}%s", htmlEnd)

}

func addToDict(dict map[string]int, dictIndex *int, name *string) int {
	storedIndex, found := dict[*name]
	if !found {
		dict[*name] = *dictIndex
		*dictIndex ++
		return *dictIndex - 1
	}

	return storedIndex
}

func printDictionary(indexMap map[int]string) {

	fmt.Printf("dict:[")

	nextId := 0
	for {
		if nextId == len(indexMap) {
			break
		}

		if nextId != 0 {
			fmt.Printf(",")
		}

		fmt.Printf("%q", indexMap[nextId])
		nextId ++
	}


	fmt.Printf("]")
}

func printFlame(currentItem *StackItem, indexMap map[int]string) {
	fmt.Printf("flame:")
	printCurrentItem(0, currentItem, indexMap)
}

func printCurrentItem(id int, currentItem *StackItem, indexMap map[int]string) {
	fmt.Printf("[%d,%d", id, currentItem.value)

	childrenLength := len(currentItem.children)

	if (childrenLength > 0) {

		// Sort by function name
		childrenDict := make(map[string]int)
		var functionNames = make([]string,childrenLength)
		var counter = 0

		for functionId, _ := range currentItem.children {
			functionName := indexMap[functionId]
			childrenDict[functionName] = functionId
			functionNames[counter] = functionName
			counter ++
		}

		sort.Strings(functionNames)

		// Print child items
		for i := 0; i < childrenLength; i++ {
			functionId := childrenDict[functionNames[i]]
			childItem := currentItem.children[functionId]

			fmt.Printf(",")
			printCurrentItem(functionId, childItem, indexMap)
		}

//		for functionId, nextItem := range currentItem.children {
//
//			fmt.Printf(",")
//			printCurrentItem(functionId, nextItem)
//		}
	}

	fmt.Printf("]")
}

