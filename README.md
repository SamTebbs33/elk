<img src="res/elk.png" width="100px" height="100px"/> Elk
===

Elk is a templating language written in JavaScript that compiles to HTML. It comes as a Node.js plugin and a command line program will be in the works soon.

## Try elk
You can try elk [here](https://samtebbs33.github.io/elk)

## Learn elk
You can learn elk [here](https://samtebbs33.gitbooks.io/elk/content/)

## Installation
Create a Node.js project and run `npm install elk` then use `var elk = require("elk")` in your project source to import it.

## Usage in Node.js
1. Run `npm install elk`
2. Require it with `var elk = require("elk")`
3. Compile an elk file
    * Compile a string: `elk.compile(string, data = {}, indentation = 0)`
    * Compile a directory: `elk.compileDir(dirPath, outputDir, data = {}, config = {})`
    * Compile a file: `elk.compileFile(filePath, outputFile, data = {})`
    * Compile multiple files or directories: `elk.compileFiles(fileArray, outputDir, data = {}, config = {})`

## Usage as executable
1. Download the executable from the [releases](https://github.com/SamTebbs33/elk/releases) page
2. Place it somewhere in your executable path
3. Run `elk -d data_file.json -o output_dir` with a space separated list of files/directories to compile
    * `elk index.elk admin.elk -o www/html`
    * `elk index.elk -d data.json -o site`
    * `elk elk_files index.elk`
    * The output directory defaults to the current directory