/**
 * Created by samtebbs on 28/09/2016.
 */
var elk = require("./elk.js")
var fs = require("fs")

elk.addTemplateFunction("list", function (indent, args) {
  var str = elk.makeStr("<ul>", indent)
  var array = elk.evalTemplateExpr(args[0].node.node)
  var format = args[1].node
  var formatIsSingle = format.type === STRING || (format.type === TEMPLATE_EXPR && format.node.type === TEMPLATE_VAR)
  for (var i in array) {
    var item = array[i]
    elk.pushDataContext({_item: item})
    str += "\n" + elk.makeStr("<li>", indent + 1) + (formatIsSingle ? "" : "\n") + elk.genStatement(format, formatIsSingle ? 0 : indent + 2) + (formatIsSingle ? "" : "\n") + makeStr("</li>", formatIsSingle ? 0 : indent + 1)
    elk.popDataContext()
  }
  return str + "\n" + elk.makeStr("</ul>", indent)
})

elk.addTemplateFunction("pages", function (indent, args) {
  var path = args.length > 0 ? elk.genStatement(args[0].node, 0) : "."
  var files = fs.readdirSync(path).filter(function (elem) {
    return elem.endsWith(".html")
  })
  return files
})

elk.addTemplateFunction("include", function (indent, args) {
  var path = elk.genStatement(args[0].node) + elk.fileExtension
  var content = fs.readFileSync(path).toString()
  var compiled = elk.compile(content, elk.getTemplateDataRoot(), indent)
  return compiled.data ? compiled.data : ""
})