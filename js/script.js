/** var quillElk = new Quill('#elk-text', {
  modules: {
    toolbar: false
  },
  theme: 'snow'
});

var quillJson = new Quill('#json-text', {
  modules: {
    toolbar: false
  },
  theme: 'snow'
});
**/

var oldElkText = ""
var oldJsonText = ""
var oldCssText = ""
var newHtmlText = ""
var elkError = document.getElementById("error")
var jsonError = document.getElementById("error")
var elkTextArea = document.getElementById("elk-text")
var jsonTextArea = document.getElementById("json-text")
var cssTextArea = document.getElementById("css-text")

var jsonEditor = CodeMirror(jsonTextArea, {
  value: '{\n\t"header":  "Hi :)"\n}',
  mode:  "application/json",
  lineNumbers: true,
  styleActiveLine: true,
  matchBrackets: true
});

var elkEditor = CodeMirror(elkTextArea, {
  value: 'html {\n\thead {\n\t\t\n\t}\n\tbody {\n\t\th1: $header\n\t}\n}',
  mode:  "json",
  lineNumbers: true,
  styleActiveLine: true,
  matchBrackets: true
});

var cssEditor = CodeMirror(cssTextArea, {
  value: 'h1 {\n\tcolor: blue;\n}',
  mode:  "css",
  lineNumbers: true,
  styleActiveLine: true,
  matchBrackets: true
});

function replace(existing, editor) {
  editorElement = editor.getWrapperElement()
  for (var cls of existing.classList) {
    editorElement.classList.add(cls)
  }
  existing.parentNode.replaceChild(editorElement, existing);
}

replace(cssTextArea, cssEditor)
replace(jsonTextArea, jsonEditor)
replace(elkTextArea, elkEditor)
setInterval(compile, 200)

function error(msg, element) {
  element.setAttribute("title", msg)
  element.style.visibility = "visible"
}

function clearError(element) {
  element.setAttribute("title", "")
  element.style.visibility = "hidden"
}

function setHTML(html, style) {
  document.getElementById("html-text").innerHTML = "<style>" + style + "</style>" + html
}

function compile() {
  var elkText = elkEditor.getValue()
  var jsonText = jsonEditor.getValue()
  var styleText = cssEditor.getValue()
  if(elkText !== oldElkText || jsonText !== oldJsonText) {
    oldElkText = elkText
    oldJsonText = jsonText
    oldCssText = styleText
    try {
      var compileResult = elk.compile(elkText, JSON.parse(jsonText))
      if(!compileResult.errored) {
        newHtmlText = compileResult.data
        clearError(jsonError)
        clearError(elkError)
        setHTML(newHtmlText, styleText)
      } else {
        var errData = compileResult.errData
        var errMsg = typeof errData === 'string' ? errData : "Syntax error at " + errData.location.line + ", " + errData.location.column;
        clearError(jsonError)
        error(errMsg, elkError)
      }
    } catch(e) {
      error(e, jsonError)
    }
  } else if(styleText !== oldCssText) {
    oldCssText = styleText
    setHTML(newHtmlText, styleText)
  }
}
