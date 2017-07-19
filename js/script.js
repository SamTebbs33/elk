setInterval(compile, 50)
var oldText = ""
var elkCookieName = "elk-text"
var cookieName = "html-text"
var errorCookieName = "error-text"

function setError(msg) {
    $("#error-text").html(msg)
    Cookies.set(errorCookieName, msg)
}

function setHTML(msg) {
    $("#html-text").html(msg)
    Cookies.set(cookieName, msg)
}

function setIfExists(name, func) {
    var cookie = Cookies.get(name)
    if(cookie !== undefined) func(cookie)
}

function setElk(text) {
    Cookies.set(elkCookieName, text)
}

setIfExists(cookieName, setHTML)
setIfExists(elkCookieName, setElk)
setIfExists(errorCookieName, setError)

function compile() {
    var elkText = $("#elk-text").val()
    if(elkText !== oldText) {
        oldText = elkText
        var result = elk.compile(elkText, {}, 0)
        if(!result.errored) {
            setError("")
            setHTML(result.data)
        } else {
            errData = result.errData;
            errMsg = typeof errData === 'string' ? errData : "Syntax error at " + errData.location.line + ", " + errData.location.column;
            setError(errMsg)
        }
        console.log(result)
    }
}
