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

elk.addTemplateFunction("list", function (indent, args) {
  var str = "<ul>"
  var mapper = (x, f, i) => "\n" + elk.makeStr("<li>", i + 1) + (f.isSimple() ? "" : "\n") + f.gen(i) + (f.isSimple() ? "" : "\n") + elk.makeStr("</li>", i)
  return "<ul>" + map(indent, args[1], args[0].eval(indent), mapper) + "\n" + elk.makeStr("</ul>", indent)
})

elk.addTemplateFunction("each", function (indent, args) {
  return map(indent, args[1], args[0].eval(indent), (x, f, i) => f.gen(indent))
})

// Returns the node if the first argument is true
elk.addTemplateFunction("if", function (indent, args) {
  if (args[0].exists() && args[0].gen(indent) == "true") return args[1].gen(indent);
  return args.length > 2 ? args[2].gen(indent) : " "
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
