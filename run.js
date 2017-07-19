/**
 * Created by samtebbs on 18/07/2017.
 */
const fs = require("fs")
var elk = require("./elk.js")

var args = process.argv;
if(args.length > 2) {
    var file = args[2];
    var out = args.length > 3 ? args[3] : "."
    var data = args.length > 4 ? JSON.parse(fs.readFileSync(args[4], 'utf8')) : null
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