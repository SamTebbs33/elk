var assert = require('assert');
var elk = require("../src/elk.js");
var nodes = require("../src/nodes.js");
describe('HTML generation', function() {
    describe('Tag', function() {
        it('should parse', function() {
            testParser("html {}", "<html></html>")
            testParser("html {\n}", "<html></html>")
        })
        it("should parse classes", function () {
            testParser("div.someClass", "<div class=\"someClass\"></div>")
            testParser("div.someClass.someOtherClass", "<div class=\"someClass someOtherClass\"></div>")
        })
        it("should parse a single ID", function () {
            testParser("div#someID", "<div id=\"someID\"></div>")
            testParserFailure("div#someID#someOtherID")
        })
        it("should parse attributes", function () {
            testParser("div [name='someName']", "<div name=\"someName\"></div>")
            testParser("div [name='someName', attr='someAttr']", "<div name=\"someName\" attr=\"someAttr\"></div>")
        })
        it("should parse a single ref", function () {
            testParser("div@'github.com'", "<div src=\"github.com\"></div>")
            testParser("a@'google.com'", "<a href=\"google.com\"></a>")
            testParser("link@'google.com'", "<link href=\"google.com\"/>")
            testParserFailure("div@'github.com'@'github2.com'")
        })
        it("should parse combined metadata", function () {
            testParser("div#someID.someClass", "<div id=\"someID\" class=\"someClass\"></div>")
            testParser("div#someID.someClass.someOtherClass", "<div id=\"someID\" class=\"someClass someOtherClass\"></div>")
            testParser("div#someID.someClass@'someURl'", "<div id=\"someID\" class=\"someClass\" src=\"someURl\"></div>")
            testParser("div#someID.someClass.someOtherClass@'someURl'", "<div id=\"someID\" class=\"someClass someOtherClass\" src=\"someURl\"></div>")
            testParser("div#someID.someClass.someOtherClass@'someURl' [someAttr = 'someValue'] ", "<div id=\"someID\" class=\"someClass someOtherClass\" src=\"someURl\" someAttr=\"someValue\"></div>")
        })
        it("should not allow void tags with a body", function () {
            for (i in nodes.voidTags) {
                const tag = nodes.voidTags[i];
                testParserFailure(tag + ": 'bad body'", "Void tags cannot have a body: '" + tag + "'")
            }
        })
    });
    describe('Data assignment', function () {
        it('should set a variable', function () {
            testParser("testVar = 'testValue' $testVar", "testValue");
        })
    })
    describe('If statement', function () {
        it('should run if condition is true', function () {
            testParser("if true: 'works!'", "works!")
        })
        it('should not run if condition is false', function () {
            testParser("if false: 'works!' else: \"doesn't work!\"", "doesn't work!")
        })
        it('should run else-if if its condition is true', function () {
            testParser("if false { \"doesn't work!\" } else if true { \"works!\" }", "works!")
        })
        it('should not run else-if if its condition is false', function () {
            testParser("if false { \"doesn't work!\" } else if false { \"works!\" }", "")
        })
        it('should not run else stmt if condition is true', function () {
            testParser("if true { 'works!' } else { \"doesn't work!\" }", "works!")
        })
        it('should run else stmt if condition is false', function () {
            testParser("if false { \"doesn't work!\" } else { \"works!\" }", "works!")
        })
    })
    describe("For loop", function () {
        it("should run", function () {
            testParser("for i in $numbers: $i", "12345", {"numbers": [1, 2, 3, 4, 5]});
        })
        it("should not run with empty expression", function () {
            testParser("for i in $numbers: $i", "", {"numbers": []});
        })
        it("should detect existing loop variable", function () {
            testParserFailure("for i in $numbers: $i", "Variable 'i' already exists", {"numbers": [], "i": [123]});
        })
    })
    describe("While loop", function () {
        it("should run", function () {
            testParser("while $x { $x x = false }", "true", {"x": true});
        })
        it("should not run if condition is false", function () {
            testParser("while $x { $x }", "", {"x": false});
        })
    })
    describe("Match statement", function () {
        it("should parse", function () {
            testParser("match 123 {}", "")
            testParser(`match 123 {
                case 123: ""
                case 321: ""
            }`, "")
        })
        it("should match correctly", function () {
            testParser(`
                toMatch = 123
                match $toMatch {
                    case 456: "doesn't work"
                }
                `, "")
            testParser(`
                toMatch = 123
                match $toMatch {
                }
                `, "")
            testParser(`
                toMatch = 123
                match $toMatch {
                    case 321: "doesn't work"
                    case 123: "works"
                }
                `, "works")
        })
    })
});

function testParserFailure(elkCode, errMsg, data = {}) {
    try {
        var res = elk.compile(elkCode, data);
    } catch (err) {
        if(errMsg) assert.equal(err.message, errMsg)
        return
    }
    if(!res.errored) fail(res.data);
    if(errMsg) assert.equal(res.data, errMsg)
}

function testParser(elkCode, html, data = {}) {
    var res = elk.compile(elkCode, data, 0, false);
    if(res.errored) fail(res.errData);
    assert.equal(res.data, html);
}

function fail(err) {
    console.log(err);
    assert.ok(false);
}
