/**
 * Created by samtebbs on 28/09/2016.
 */
var elk = require("./elk.js")
var nodes = require("./nodes.js")
var fs = require("fs")

function map(indent, format, array, mapper) {
  var str = ""
  var formatIsSingle = format.isSimple()
  var formatIndent = formatIsSingle ? 0 : indent + 1
  for (var i in array) {
    var item = array[i]
    elk.pushDataContext({_item: item})
    str += mapper(item, format, formatIndent)
    elk.popDataContext()
  }
  return str
}

function concat(indent, srcArray, mapVar, unique) {
  var array = []
  for (var i in srcArray) {
    var item = srcArray[i]
    elk.pushDataContext({_item: item})
    var stuff = mapVar.eval(indent).slice()
    elk.popDataContext()
    if(elk.isArray(stuff)) for (var j in stuff) if(!(unique && array.includes(stuff[j]))) array.push(stuff[j])
    else if(!(unique && array.includes(stuff))) stuff.push(stuff)
  }
  return array
}

elk.addTemplateFunction("time", function (indent, args) {
  return moment().format(args[0].eval(0))
})

elk.addTemplateFunction("exists", function (indent, args) {
  return args[0].exists() ? true : false
})

elk.addTemplateFunction("map", function (indent, args) {
  var array = []
  var srcArray = args[0].eval(indent)
  for (var i in srcArray) {
    elk.pushDataContext({_item: srcArray[i]})
    array.push(args[1].eval(indent))
    elk.popDataContext()
  }
  return array
})

elk.addTemplateFunction("concat", function (indent, args) {
  return concat(indent, args[0].eval(indent), args[1], false)
})

elk.addTemplateFunction("concat_unique", function (indent, args) {
  return concat(indent, args[0].eval(indent), args[1], true)
})

elk.addTemplateFunction("list", function (indent, args) {
  var mapper = (x, f, i) => "\n" + elk.makeStr("<li>", i) + (f.isSimple() ? "" : "\n") + f.gen(i + 1) + (f.isSimple() ? "" : "\n") + elk.makeStr("</li>", i)
  return new nodes.Tag("ul", null, null, map(indent, args[1], args[0].eval(indent), mapper))
})

elk.addTemplateFunction("js", function (indent, args) {
  var script = args[0].gen(0)
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
