(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var P = require("parsimmon")
var minimist = require('minimist')
var fs = require("fs")
var path = require("path")

var escapes = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  "\"": "\"",
  "\'": "\'"
};

function exp(val, name) {
  if(!name) name = val.name
  module.exports[name] = val
}

function interpretEscapes(str) {
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/g, function(_, escape) {
    var type = escape.charAt(0);
    var hex = escape.slice(1);
    if (type === 'u') return String.fromCharCode(parseInt(hex, 16));
    if (escapes.hasOwnProperty(type)) return escapes[type];
    return type;
  });
}

function token(p) {
  return whitespace.then(p.skip(whitespace));
}

function optional(p) {
  return p.atMost(1).map(function(x) { if(x.length === 0) return null; else return x[0] })
}

function surround(surrounder, parser, surrounder2) {
  return surrounder.then(parser.skip(surrounder2))
}

function type(p, id) {
  return p.desc(id).map(function (x) {
    return {type: id, node: x}
  })
}

var templateDataStack = []
var templateFunctions = {}

function addTemplateFunction(name, func) {
  templateFunctions[name] = func
}
exp(addTemplateFunction)

function getTemplateFunction(name) {
  return templateFunctions[name]
}
exp(getTemplateFunction)

function pushDataContext(context) {
  templateDataStack.push(context)
}
exp(pushDataContext)

function popDataContext() {
  return templateDataStack.pop()
}
exp(popDataContext)

function peekDataContext() {
  return templateDataStack[templateDataStack.length - 1]
}
exp(peekDataContext)

function getDataFromContext(varArray, throwException) {
  if(throwException === undefined) throwException = true
  var dataStack = templateDataStack.reverse()
  for(var i in dataStack) {
    var obj = dataStack[i]
    var found = true
    for(var i in varArray) {
      var varName = varArray[i]
      if(obj.hasOwnProperty(varName)) obj = obj[varName]
      else {
        found = false
        break
      }
    }
    if(found) return obj
  }
  if(throwException) throw new ElkError("Undefined variable '" + varArray.join(".") + "'")
  return undefined
}
exp(getDataFromContext)

function dataExistsInContext(varArray) {
  return getDataFromContext(varArray, false) !== undefined
}
exp(dataExistsInContext)

function setDataInContext(name, value) {
  peekDataContext()[name] = value
}
exp(setDataInContext)

function removeDataFromContext(name) {
  delete peekDataContext()[name]
}
exp(removeDataFromContext)

function getTemplateDataRoot() {
  return templateDataStack[0]
}
exp(getTemplateDataRoot)

// Parsers
var comment = P.regexp(/\s*(?:\/\/).*/)
var whitespace = P.regexp(/\s*/m)
var tag_identifier = token(P.regexp(/[a-zA-Z0-9]+/))
var identifier = token(P.regexp(/-?[_a-zA-Z]+[_a-zA-Z0-9-]*/))
var dot = token(P.string("."))
var hash = token(P.string("#"))
var clss = dot.then(identifier)
var id = hash.then(identifier)
var colon = token(P.string(":"))
var equals = token(P.string("="))
var str = token(P.regexp(/"((?:\\.|.)*?)"/, 1)).map(a => new nodes.StringNode(interpretEscapes(a)))
var bracketl = token(P.string("["))
var bracketr = token(P.string("]"))
var bracel = token(P.string("{"))
var bracer = token(P.string("}"))
var parenl = token(P.string("("))
var parenr = token(P.string(")"))
var comma = token(P.string(","))
var dollar_sign = token(P.string("$"))
var keyw_for = token(P.string("for"))
var keyw_in = token(P.string("in"))
var keyw_if = token(P.string("if"))
var keyw_else = token(P.string("else"))
var statement = P.lazy(function() {
  return P.seqMap(P.alt(str, template_expr, tag), optional(metadata), function (stmt, m) {
    if(stmt.metadata === null) stmt.metadata = m
    return stmt
  })
})
var attribute = P.seqMap(tag_identifier, equals, statement, function(name, c, s) {
  return new nodes.Attribute(name, s)
})
var attributes = surround(bracketl, P.sepBy1(attribute, comma), bracketr).map(a => new nodes.Attributes(a))
var metadata = P.seqMap(optional(clss), optional(id), optional(attributes), function (c, i, a) {
  return new nodes.Metadata(c, i, a)
})
var block = P.lazy(function() {
  return P.alt(colon.then(statement), bracedBlock)
})
var tag = P.seqMap(tag_identifier, optional(metadata), optional(block), function (name, m, block) {
  return new nodes.Tag(name, m, block)
})
var template_expr = P.lazy(function () { return P.alt(template_loop, template_if, template_func_call, template_var) })
var template_var = dollar_sign.then(P.sepBy1(identifier, dot)).map(a => new nodes.TemplateVar(a))
var func_call_args = P.sepBy(statement, comma)
var template_func_call = P.seqMap(identifier, parenl, func_call_args, parenr, function(id, p1, args, p2) {
  return new nodes.TemplateFuncCall(id, args)
})
var template_loop = keyw_for.then(P.seqMap(tag_identifier, keyw_in, template_expr, block, function (id, keyw, expr, block) {
  return new nodes.TemplateLoop(id, expr, block)
}))
var template_else = dollar_sign.then(keyw_else.then(block)).map(b => new nodes.TemplateIf(null, b, null))
var template_if = P.lazy(function(){return keyw_if.then(P.seqMap(template_expr, block,  optional(P.alt(keyw_else.then(template_if), template_else)), function(expr, block, e) {
  return new nodes.TemplateIf(expr, block, e)
}))})
var statements = statement.atLeast(0).map(a => new nodes.Statements(a))
var bracedBlock = surround(bracel, statements, bracer)

var indentString = "\t"

function makeStr(str, indent) {
  for(var i = 0; i < indent; i++) str = indentString + str
  return str;
}
exp(makeStr)

function isString(v) {
  return typeof v === "string"
}
exp(isString)

function isObject(v) {
  return typeof v === "object"
}
exp(isObject)

function isArray(v) {
  return v.constructor == Array
}
exp(isArray)

function ElkError (msg) {
  this.msg = msg
}
ElkError.prototype = new Error();
module.exports.ElkError = ElkError

function reportError(result) {
  var line = result.index.line
  var column = result.index.column
  var expected = result.expected
  console.log("Syntax error@" + line + ":" + column + ": expected " + expected.join(", "));
}
exp(reportError)

var fileExtension = ".elk"
exp(fileExtension, "fileExtension")

function removeExtension(str) {
  return str.slice(0, -fileExtension.length)
}
exp(removeExtension)

function isDir(path) {
  return fs.lstatSync(path).isDirectory()
}
exp(isDir)

function makeResult(errored, errData, successData) {
  if(!successData) successData = null
  return { errored: errored, errData: errData, data: successData }
}
exp(makeResult)

function parse(content) {
  var result = statements.parse(content)
  if(!result.status) return makeResult(true, { location: result.index, expected: result.expected })
  return makeResult(false, null, result.value)
}
exp(parse)

function convert(parseTree, indent) {
  if(!indent) indent = 0
  try {
    return makeResult(false, null, parseTree.gen(indent))
  } catch (err) {
    if(err instanceof ElkError) return makeResult(true, err.msg, null)
    else throw err
  }
}
exp(convert)

function compile(content, data, indent) {
  if(!indent) indent = 0
  if(!data) data = {}
  pushDataContext(data)
  var result = parse(content)
  if(!result.errored) result = convert(result.data, indent);
  popDataContext()
  return result
}
exp(compile)

function compileFile(path, outputPath, data) {
  var content = fs.readFileSync(path).toString()
  var output = compile(content, data)
  if(output.errored) return output
  else fs.writeFileSync(outputPath, output.data)
  return output
}
exp(compileFile)

function compileDir(path, outputPath, data, config) {
  var files = fs.readdirSync(path)
  var results = {}
  for(var i in files) {
    var file = files[i]
    if(config.recurse && isDir(path + "/" + file)) {
      compileDir(path + "/" + file, outputPath + "/" + file, data, config)
    } else if(file.endsWith(fileExtension)) {
      var withoutExtension = removeExtension(file)
      results[file] = compileFile(path + "/" + file, outputPath + "/" + withoutExtension + ".html", data, config)
    }
  }
  return results
}
exp(compileDir)

function compileFiles(files, outPath, data, config) {
  if(!config) config = {
    recurse: false
  }
  if(!data) data = {}
  var result = {}
  for(var i in files) {
    var file = files[i]
    var compileResult = null
    if(isDir(file)) compileResult = compileDir(file, outPath, data, config)
    else compileResult = compileFile(file, outPath + "/" + path.basename(file).replace(".elk", ".html"), data)
    result[file] = compileResult
  }
  return result
}
exp(compileFiles)

require("./functions.js")
var nodes = require("./nodes.js")
if(window) window.elk = module.exports

},{"./functions.js":2,"./nodes.js":5,"fs":6,"minimist":3,"parsimmon":4,"path":7}],2:[function(require,module,exports){
/**
 * Created by samtebbs on 28/09/2016.
 */
var elk = require("./elk.js")
var fs = require("fs")

elk.addTemplateFunction("list", function (indent, args) {
  var str = "<ul>"
  var array = args[0].eval(indent)
  var format = args[1]
  var formatIsSingle = format.isSimple()
  var formatIndent = formatIsSingle ? 0 : indent + 1
  for (var i in array) {
    var item = array[i]
    elk.pushDataContext({_item: item})
    str += "\n" + elk.makeStr("<li>", indent + 1) + (formatIsSingle ? "" : "\n") + format.gen(formatIndent) + (formatIsSingle ? "" : "\n") + elk.makeStr("</li>", formatIndent)
    elk.popDataContext()
  }
  return str + "\n" + elk.makeStr("</ul>", indent)
})

elk.addTemplateFunction("js", function (indent, args) {
  var script = args[0].gen()
  return new Function(script)()
})

elk.addTemplateFunction("set", function (indent, args) {
  elk.setDataInContext(args[0].gen(0), args[1].gen(0))
  return ""
})

elk.addTemplateFunction("pages", function (indent, args) {
  var path = args.length > 0 ? args[0].gen(0) : "."
  var files = fs.readdirSync(path).filter(function (elem) {
    return elem.endsWith(".html")
  })
  return files
})

elk.addTemplateFunction("include", function (indent, args) {
  var path = args[0].gen(0) + elk.fileExtension
  var content = fs.readFileSync(path).toString()
  var compiled = elk.compile(content, elk.getTemplateDataRoot(), 0)
  return compiled.data ? compiled.data : ""
})
},{"./elk.js":1,"fs":6}],3:[function(require,module,exports){
module.exports = function (args, opts) {
    if (!opts) opts = {};
    
    var flags = { bools : {}, strings : {}, unknownFn: null };

    if (typeof opts['unknown'] === 'function') {
        flags.unknownFn = opts['unknown'];
    }

    if (typeof opts['boolean'] === 'boolean' && opts['boolean']) {
      flags.allBools = true;
    } else {
      [].concat(opts['boolean']).filter(Boolean).forEach(function (key) {
          flags.bools[key] = true;
      });
    }
    
    var aliases = {};
    Object.keys(opts.alias || {}).forEach(function (key) {
        aliases[key] = [].concat(opts.alias[key]);
        aliases[key].forEach(function (x) {
            aliases[x] = [key].concat(aliases[key].filter(function (y) {
                return x !== y;
            }));
        });
    });

    [].concat(opts.string).filter(Boolean).forEach(function (key) {
        flags.strings[key] = true;
        if (aliases[key]) {
            flags.strings[aliases[key]] = true;
        }
     });

    var defaults = opts['default'] || {};
    
    var argv = { _ : [] };
    Object.keys(flags.bools).forEach(function (key) {
        setArg(key, defaults[key] === undefined ? false : defaults[key]);
    });
    
    var notFlags = [];

    if (args.indexOf('--') !== -1) {
        notFlags = args.slice(args.indexOf('--')+1);
        args = args.slice(0, args.indexOf('--'));
    }

    function argDefined(key, arg) {
        return (flags.allBools && /^--[^=]+$/.test(arg)) ||
            flags.strings[key] || flags.bools[key] || aliases[key];
    }

    function setArg (key, val, arg) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg) === false) return;
        }

        var value = !flags.strings[key] && isNumber(val)
            ? Number(val) : val
        ;
        setKey(argv, key.split('.'), value);
        
        (aliases[key] || []).forEach(function (x) {
            setKey(argv, x.split('.'), value);
        });
    }

    function setKey (obj, keys, value) {
        var o = obj;
        keys.slice(0,-1).forEach(function (key) {
            if (o[key] === undefined) o[key] = {};
            o = o[key];
        });

        var key = keys[keys.length - 1];
        if (o[key] === undefined || flags.bools[key] || typeof o[key] === 'boolean') {
            o[key] = value;
        }
        else if (Array.isArray(o[key])) {
            o[key].push(value);
        }
        else {
            o[key] = [ o[key], value ];
        }
    }
    
    function aliasIsBoolean(key) {
      return aliases[key].some(function (x) {
          return flags.bools[x];
      });
    }

    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        
        if (/^--.+=/.test(arg)) {
            // Using [\s\S] instead of . because js doesn't support the
            // 'dotall' regex modifier. See:
            // http://stackoverflow.com/a/1068308/13216
            var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
            var key = m[1];
            var value = m[2];
            if (flags.bools[key]) {
                value = value !== 'false';
            }
            setArg(key, value, arg);
        }
        else if (/^--no-.+/.test(arg)) {
            var key = arg.match(/^--no-(.+)/)[1];
            setArg(key, false, arg);
        }
        else if (/^--.+/.test(arg)) {
            var key = arg.match(/^--(.+)/)[1];
            var next = args[i + 1];
            if (next !== undefined && !/^-/.test(next)
            && !flags.bools[key]
            && !flags.allBools
            && (aliases[key] ? !aliasIsBoolean(key) : true)) {
                setArg(key, next, arg);
                i++;
            }
            else if (/^(true|false)$/.test(next)) {
                setArg(key, next === 'true', arg);
                i++;
            }
            else {
                setArg(key, flags.strings[key] ? '' : true, arg);
            }
        }
        else if (/^-[^-]+/.test(arg)) {
            var letters = arg.slice(1,-1).split('');
            
            var broken = false;
            for (var j = 0; j < letters.length; j++) {
                var next = arg.slice(j+2);
                
                if (next === '-') {
                    setArg(letters[j], next, arg)
                    continue;
                }
                
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
                    setArg(letters[j], next.split('=')[1], arg);
                    broken = true;
                    break;
                }
                
                if (/[A-Za-z]/.test(letters[j])
                && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
                    setArg(letters[j], next, arg);
                    broken = true;
                    break;
                }
                
                if (letters[j+1] && letters[j+1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j+2), arg);
                    broken = true;
                    break;
                }
                else {
                    setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
                }
            }
            
            var key = arg.slice(-1)[0];
            if (!broken && key !== '-') {
                if (args[i+1] && !/^(-|--)[^-]/.test(args[i+1])
                && !flags.bools[key]
                && (aliases[key] ? !aliasIsBoolean(key) : true)) {
                    setArg(key, args[i+1], arg);
                    i++;
                }
                else if (args[i+1] && /true|false/.test(args[i+1])) {
                    setArg(key, args[i+1] === 'true', arg);
                    i++;
                }
                else {
                    setArg(key, flags.strings[key] ? '' : true, arg);
                }
            }
        }
        else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(
                    flags.strings['_'] || !isNumber(arg) ? arg : Number(arg)
                );
            }
            if (opts.stopEarly) {
                argv._.push.apply(argv._, args.slice(i + 1));
                break;
            }
        }
    }
    
    Object.keys(defaults).forEach(function (key) {
        if (!hasKey(argv, key.split('.'))) {
            setKey(argv, key.split('.'), defaults[key]);
            
            (aliases[key] || []).forEach(function (x) {
                setKey(argv, x.split('.'), defaults[key]);
            });
        }
    });
    
    if (opts['--']) {
        argv['--'] = new Array();
        notFlags.forEach(function(key) {
            argv['--'].push(key);
        });
    }
    else {
        notFlags.forEach(function(key) {
            argv._.push(key);
        });
    }

    return argv;
};

function hasKey (obj, keys) {
    var o = obj;
    keys.slice(0,-1).forEach(function (key) {
        o = (o[key] || {});
    });

    var key = keys[keys.length - 1];
    return key in o;
}

function isNumber (x) {
    if (typeof x === 'number') return true;
    if (/^0x[0-9a-f]+$/i.test(x)) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
}


},{}],4:[function(require,module,exports){
(function(r,t){if(typeof define==="function"&&define.amd){define([],t)}else if(typeof module==="object"&&module.exports){module.exports=t()}else{r.Parsimmon=t()}})(this,function(){"use strict";var r={};function t(r){if(!(this instanceof t))return new t(r);this._=r}r.Parser=t;var n=t.prototype;function e(r,t){return{status:true,index:r,value:t,furthest:-1,expected:[]}}function u(r,t){return{status:false,index:-1,value:null,furthest:r,expected:[t]}}function a(r,t){if(!t)return r;if(r.furthest>t.furthest)return r;var n=r.furthest===t.furthest?i(r.expected,t.expected):t.expected;return{status:r.status,index:r.index,value:r.value,furthest:t.furthest,expected:n}}function i(r,t){var n=r.length;var e=t.length;if(n===0){return t}else if(e===0){return r}var u={};for(var a=0;a<n;a++){u[r[a]]=true}for(var a=0;a<e;a++){u[t[a]]=true}var i=[];for(var f in u){if(u.hasOwnProperty(f)){i.push(f)}}i.sort();return i}function f(r){if(!(r instanceof t)){throw new Error("not a parser: "+r)}}function o(r){if(typeof r!=="number"){throw new Error("not a number: "+r)}}function s(r){if(!(r instanceof RegExp)){throw new Error("not a regexp: "+r)}var t=E(r);for(var n=0;n<t.length;n++){var e=t.charAt(n);if(e!="i"&&e!="m"&&e!="u"){throw new Error('unsupported regexp flag "'+e+'": '+r)}}}function c(r){if(typeof r!=="function"){throw new Error("not a function: "+r)}}function v(r){if(typeof r!=="string"){throw new Error("not a string: "+r)}}function l(r){if(r.length===1)return r[0];return"one of "+r.join(", ")}function h(r,t){var n=t.index;var e=n.offset;if(e===r.length)return", got the end of the stream";var u=e>0?"'...":"'";var a=r.length-e>12?"...'":"'";return" at line "+n.line+" column "+n.column+", got "+u+r.slice(e,e+12)+a}var p=r.formatError=function(r,t){return"expected "+l(t.expected)+h(r,t)};n.parse=function(r){if(typeof r!=="string"){throw new Error(".parse must be called with a string as its argument")}var t=this.skip(W)._(r,0);return t.status?{status:true,value:t.value}:{status:false,index:G(r,t.furthest),expected:t.expected}};var d=r.seq=function(){var r=[].slice.call(arguments);var n=r.length;for(var u=0;u<n;u+=1){f(r[u])}return t(function(t,u){var i;var f=new Array(n);for(var o=0;o<n;o+=1){i=a(r[o]._(t,u),i);if(!i.status)return i;f[o]=i.value;u=i.index}return a(e(u,f),i)})};var g=r.seqMap=function(){var r=[].slice.call(arguments);if(r.length===0){throw new Error("seqMap needs at least one argument")}var t=r.pop();c(t);return d.apply(null,r).map(function(r){return t.apply(null,r)})};var x=r.custom=function(r){return t(r(e,u))};var m=r.alt=function(){var r=[].slice.call(arguments);var n=r.length;if(n===0)return k("zero alternates");for(var e=0;e<n;e+=1){f(r[e])}return t(function(t,n){var e;for(var u=0;u<r.length;u+=1){e=a(r[u]._(t,n),e);if(e.status)return e}return e})};var w=r.sepBy=function(t,n){return y(t,n).or(r.of([]))};var y=r.sepBy1=function(r,t){f(r);f(t);var n=t.then(r).many();return r.chain(function(r){return n.map(function(t){return[r].concat(t)})})};n.or=function(r){return m(this,r)};n.then=function(r){if(typeof r==="function"){throw new Error("chaining features of .then are no longer supported, use .chain instead")}f(r);return d(this,r).map(function(r){return r[1]})};n.many=function(){var r=this;return t(function(t,n){var u=[];var i;var f;for(;;){i=a(r._(t,n),i);if(i.status){n=i.index;u.push(i.value)}else{return a(e(n,u),i)}}})};n.times=function(r,n){if(arguments.length<2)n=r;var u=this;o(r);o(n);return t(function(t,i){var f=[];var o=i;var s;var c;for(var v=0;v<r;v+=1){s=u._(t,i);c=a(s,c);if(s.status){i=s.index;f.push(s.value)}else return c}for(;v<n;v+=1){s=u._(t,i);c=a(s,c);if(s.status){i=s.index;f.push(s.value)}else break}return a(e(i,f),c)})};n.result=function(r){return this.map(function(t){return r})};n.atMost=function(r){return this.times(0,r)};n.atLeast=function(r){var t=this;return g(this.times(r),this.many(),function(r,t){return r.concat(t)})};n.map=function(r){c(r);var n=this;return t(function(t,u){var i=n._(t,u);if(!i.status)return i;return a(e(i.index,r(i.value)),i)})};n.skip=function(r){return d(this,r).map(function(r){return r[0]})};n.mark=function(){return g(H,this,H,function(r,t,n){return{start:r,value:t,end:n}})};n.desc=function(r){var n=this;return t(function(t,e){var u=n._(t,e);if(!u.status)u.expected=[r];return u})};var _=r.string=function(r){var n=r.length;var a="'"+r+"'";v(r);return t(function(t,i){var f=t.slice(i,i+n);if(f===r){return e(i+n,f)}else{return u(i,a)}})};var E=function(r){var t=""+r;return t.slice(t.lastIndexOf("/")+1)};var O=r.regexp=function(r,n){s(r);if(arguments.length>=2){o(n)}else{n=0}var a=RegExp("^(?:"+r.source+")",E(r));var i=""+r;return t(function(r,t){var f=a.exec(r.slice(t));if(f){var o=f[0];var s=f[n];if(s!=null){return e(t+o.length,s)}}return u(t,i)})};r.regex=O;var b=r.succeed=function(r){return t(function(t,n){return e(n,r)})};var k=r.fail=function(r){return t(function(t,n){return u(n,r)})};var A=r.letter=O(/[a-z]/i).desc("a letter");var z=r.letters=O(/[a-z]*/i);var q=r.digit=O(/[0-9]/).desc("a digit");var M=r.digits=O(/[0-9]*/);var P=r.whitespace=O(/\s+/).desc("whitespace");var j=r.optWhitespace=O(/\s*/);var B=r.any=t(function(r,t){if(t>=r.length)return u(t,"any character");return e(t+1,r.charAt(t))});var R=r.all=t(function(r,t){return e(r.length,r.slice(t))});var W=r.eof=t(function(r,t){if(t<r.length)return u(t,"EOF");return e(t,null)});var F=r.test=function(r){c(r);return t(function(t,n){var a=t.charAt(n);if(n<t.length&&r(a)){return e(n+1,a)}else{return u(n,"a character matching "+r)}})};var I=r.oneOf=function(r){return F(function(t){return r.indexOf(t)>=0})};var L=r.noneOf=function(r){return F(function(t){return r.indexOf(t)<0})};var C=r.takeWhile=function(r){c(r);return t(function(t,n){var u=n;while(u<t.length&&r(t.charAt(u)))u+=1;return e(u,t.slice(n,u))})};var D=r.lazy=function(r,n){if(arguments.length<2){n=r;r=undefined}var e=t(function(r,t){e._=n()._;return e._(r,t)});if(r)e=e.desc(r);return e};var G=function(r,t){var n=r.slice(0,t).split("\n");var e=n.length;var u=n[n.length-1].length+1;return{offset:t,line:e,column:u}};var H=r.index=t(function(r,t){return e(t,G(r,t))});n.concat=n.or;n.empty=k("empty");n.of=t.of=r.of=b;n.ap=function(r){return g(this,r,function(r,t){return r(t)})};n.chain=function(r){var n=this;return t(function(t,e){var u=n._(t,e);if(!u.status)return u;var i=r(u.value);return a(i._(t,u.index),u)})};return r});

},{}],5:[function(require,module,exports){
/**
 * Created by samtebbs on 28/09/2016.
 */

var elk = require("./elk.js")

function exp(val, name) {
  if(!name) name = val.name
  module.exports[name] = val
}

class Node {
  isSimple() {
    return this instanceof StringNode || this instanceof TemplateVar
  }
  gen(indent){ return "" }
}

class Statement extends Node {
  constructor() {
    super()
    this.metadata = null
  }

  wrapMetadata(indent, genStr) {
    if(this.metadata !== null) {
      var metaStr = this.metadata.gen(0)
      if(metaStr !== "") return "<span" + metaStr + ">" + genStr + "</span>"
    }
    return genStr
  }

}
exp(Statement)

class StringNode extends Statement {
  constructor(str) {
    super()
    this.str = str
  }

  gen(indent) {
    var s = this.str.replace(/.*?\$\(([a-z_](?:\.|[a-z_]|[0-9])*)\)/g, function(match) {
      var index = match.indexOf("$(")
      var prefix = match.substr(0, index)
      var varName = match.substring(index + 2, match.length - 1)
      var varArray = varName.split(".")
      return prefix + elk.getDataFromContext(varArray)
    })
    return elk.makeStr(this.wrapMetadata(0, s), indent)
  }

}
exp(StringNode)

class Attribute extends Node {

  constructor(attrName, val) {
    super()
    this.attrName = attrName
    this.val = val
  }

  gen(indent) {
    return this.attrName + "=\"" + this.val.gen(0) + "\""
  }

}
exp(Attribute)

class Attributes extends Node {

  constructor(attrArray) {
    super()
    this.attrs = attrArray
  }

  gen(indent) {
    var attrsStr = ""
    for(var i in this.attrs) {
      var attr = this.attrs[i]
      attrsStr += " " + attr.gen(indent)
    }
    return attrsStr
  }

}
exp(Attributes)

class TemplateExpr extends Statement {

  gen(indent) {
    return elk.makeStr(this.wrapMetadata(0, this.eval(indent)), indent)
  }

  eval(indent) {
    throw "Unimplemented"
  }

}
exp(TemplateExpr)

class TemplateVar extends TemplateExpr {

  constructor(varArray) {
    super()
    this.varArray = varArray
  }

  gen(indent) {
    return elk.makeStr(this.eval(indent), indent)
  }

  eval(indent) {
    return elk.getDataFromContext(this.varArray)
  }
}
exp(TemplateVar)

class TemplateFuncCall extends TemplateExpr {

  constructor(funcName, args) {
    super()
    this.funcName = funcName
    this.args = args
  }

  eval(indent) {
    var func = elk.getTemplateFunction(this.funcName)
    if(!func) throw new elk.ElkError("Undefined function '" + this.funcName + "'")
    else return func(indent, this.args)
  }

}
exp(TemplateFuncCall)

class TemplateLoop extends TemplateExpr {

  constructor(varName, expr, block) {
    super()
    this.varName = varName
    this.expr = expr
    this.block = block
  }

  gen(indent) {
    var array = this.expr.eval(indent)
    var block = this.block
    if(elk.dataExistsInContext(this.varName)) throw new elk.ElkError("Variable '" + this.varName + "' is already defined")
    else {
      var resultArray = []
      for(var i in array) {
        var elem = array[i]
        elk.setDataInContext(this.varName, elem)
        resultArray.push(block.gen(indent))
      }
      elk.removeDataFromContext(this.varName)
      return resultArray.join("\n")
    }
  }

}
exp(TemplateLoop)

class TemplateIf extends TemplateExpr {

  constructor(expr, block, else_stmt) {
    super()
    this.expr = expr
    this.block = block
    this.else_stmt = else_stmt
  }

  eval(indent) {
    if(!this.expr) return this.block.gen(indent)
    else {
      var val = this.expr.eval(indent)
      if(val === true) return this.block.gen(indent)
      else if(this.else_stmt) {
        return this.else_stmt.eval(indent)
      }
      else return ""
    }
  }

}
exp(TemplateIf)

class Metadata extends Node {

  constructor(c, i, a) {
    super()
    this.clss = c
    this.id = i
    this.attrs = a
  }

  gen(indent) {
    var classStr = this.clss ? " class='" + this.clss + "'" : ""
    var idStr = this.id ? " id='" + this.id + "'" : ""
    var attrsStr = this.attrs ? this.attrs.gen(0) : ""
    return classStr + idStr + attrsStr
  }

}
exp(Metadata)

class Tag extends Statement {

  constructor(tag, m, block) {
    super()
    this.tag = tag
    this.metadata = m
    this.block = block
  }

  gen(indent) {
    var hasBlock = this.block !== null
    var headerStr = "<" + this.tag + this.metadata.gen(0) + ">"
    var blockIsSingle = hasBlock && (this.block instanceof StringNode || this.block instanceof TemplateVar)
    var bodyStr = hasBlock ? this.block.gen(blockIsSingle ? 0 : indent + 1) : ""
    var footerStr = elk.makeStr("</" + this.tag + ">", blockIsSingle ? 0 : indent)
    var bodySeparator = blockIsSingle ? "" : "\n"
    return elk.makeStr(headerStr , indent) + (hasBlock ? (bodySeparator + bodyStr + bodySeparator + footerStr) : ("</" + this.tag + ">"))
  }

}
exp(Tag)

class Statements extends Node {

  constructor(stmtArr) {
    super()
    this.stmtArr = stmtArr
  }

  gen(indent) {
    var stmtsStr = ""
    for(var i in this.stmtArr) stmtsStr += (i > 0 ? "\n" : "") + this.stmtArr[i].gen(indent)
    return stmtsStr
  }

}
exp(Statements)
},{"./elk.js":1}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":8}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
