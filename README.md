### html socket library
html5 WebSocket can send message directly to game server

### Installing
npm install

### example
##### server
```
    var options = {
        ip: '127.0.0.1',
        gamePort: 8888,
        webPort: 3000
    }
    var client = new HSocket(options);
    client.on('connected', function () {
        console.log('connected !!!');
    })
```
##### html
```
    var ws = new WebSocket("ws://127.0.0.1:3000");
    ws.sendData = function(data){
        ws.send(JSON.stringify(data));
    };
    ws.onmessage = function (evt) {
            console.log('WebSocketClosed on message : ', evt);
    };
    ws.onopen = function(){
        console.log('open');
        ws.sendData({event: 'login', content: {tableid : 68, gameid : 100006, session : 'whx1'}});
        ws.sendData({event: 'sitdown', content: {seatindex: 1}});
    };
    ws.onclose = function(evt){
        console.log('WebSocketClosed!', evt);
    };
    ws.onerror = function(evt){
        console.log('WebSocketError!');
    };
```