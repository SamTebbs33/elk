setInterval(compile, 50)
var oldText = ""

function compile() {
    var elkText = $("#elk-text").val()
    if(elkText !== oldText) {
        oldText = elkText
        var result = elk.compile(elkText, {}, 0)
        if(!result.errored) $("#html-text").html(result.data)
        console.log(result);
    }
}
