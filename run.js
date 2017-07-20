/**
 * Created by samtebbs on 18/07/2017.
 */
const fs = require("fs")
var elk = require("./elk.js")

var argStart = 0

var args = process.argv;
if(args.length > argStart) {
    var file = args[argStart];
    var out = args.length > argStart + 1 ? args[argStart + 1] : "."
    var data = args.length > argStart + 2 ? JSON.parse(fs.readFileSync(args[4], 'utf8')) : null
    var compileResult = elk.compileFiles([file], out, data, null)

    // Print error data
    Object.keys(compileResult).forEach(function (key) {
        var result = compileResult[key]
        if(result.errored === true) {
            console.log(key)
            console.log(result.errData)
            console.log("\n")
        }
    })
}