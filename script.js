var socket = io('http://tebbs.space:3000');

var sendElk = function() {
    console.log("sending elk");
    var text = $('#elk-text').html();
    console.log(text);
    socket.emit('elk', text);
}

$(document).keyup(function(e) {
    if (e.which == 13) {
        sendElk();
    }
});

setInterval(sendElk, 1000);

socket.on('html', function(data) {
    console.log('received compiled elk');
    console.log(data);
    $('#html-text').html(data);
});
