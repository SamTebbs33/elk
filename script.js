setInterval(compile, 50)
var oldText = ""

function setError(msg) {
    $("#error-text").html(msg)
}

function setHTML(msg) {
    $("#html-text").html(msg);
}

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
