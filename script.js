setInterval(compile, 1000)

function compile() {
    console.log("Compiling");
    var elkText = $("#elk-text").val()
    var result = elk.compile(elkText, {}, 0)
    console.log(result);
}
