/**
 * Created by samtebbs on 18/07/2017.
 */
const fs = require("fs");
var elk = require("./elk.js");
var args = require('minimist')(process.argv.slice(2));

var files = args["_"];

fs.readFile(files[0], function read(err, data) {
    if (err) {
        throw err;
    }
    const result = elk.compile(data, {}, 0);
    if(result.errored) console.log(JSON.stringify(result.errData));
    else {
        console.log(result.data);
    }
});
