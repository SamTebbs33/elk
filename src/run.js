/**
 * Created by samtebbs on 18/07/2017.
 */
const fs = require("fs")
var elk = require("./elk.js")
var args = require('minimist')(process.argv.slice(2));

var files = args["_"]

var out = args["o"]
if(!out) out = "."

var dataFile = args["d"]
var data = {}
if(dataFile) {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

var compileResult = elk.compileFiles(files, out, data)
// Print error data
Object.keys(compileResult).forEach(function (key) {
    var result = compileResult[key]
    if(result.errored === true) {
        console.log(key)
        console.log(result.errData)
        console.log("\n")
    }
})