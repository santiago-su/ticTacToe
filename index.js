var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static( __dirname + '/public' ));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  // Send array of connected sockets
  io.emit('usersConnected', Object.keys(io.sockets.connected));
  socket.on('boardState', function(state) {
    io.emit('boardState', state)
    console.log(state)
  })

});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
