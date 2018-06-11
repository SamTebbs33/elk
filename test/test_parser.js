const elk = require("./../src2/elk.js");

function test(elkCode) {
    console.log(elk);
    const result = elk.compile(elkCode, {}, 0);
    console.log(result);
}

test("html [name = \"memes\"] { 123 }");