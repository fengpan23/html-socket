"use strict";
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const WebSocketServer = require('ws').Server;
const Client = require('./lib/client');

class HSocket{
    /**
     * @param ip    game server ip
     * @param gamePort  game server port
     * @param webPort   created web server port
     */
    constructor(options) {
        EventEmitter.call(this);
        let ip = options.ip || '127.0.0.1', gamePort = options.gamePort || 8888, webPort = options.webPort || 8000;

        let me = this;
        let wss = new WebSocketServer({port: webPort});
        wss.on('connection', function(ws) {
            console.log(ws);
            let client = new Client();
            client.on('request', function (id, event, content) {
                ws.send(JSON.stringify({event: event, content: content}));
            }).on('connected', function() {
                console.info('Connected game server: ' + ip, ':', gamePort);
                ws.send(JSON.stringify({state: 'connected'}));
                ws.on('message', function incoming(message) {
                    console.info('Incoming message : ', message);
                    try{
                        let data = JSON.parse(message);
                        if(data.event){
                            client.send(0, data.event, data.content);
                        }
                    }catch(e){
                        console.error('Parse incoming message error !!');
                        me.emit('error', 'incoming data error !')
                    }
                });
                me.emit('connected');
            }).on('disconnect', function () {
                me.emit('disconnect');
            }).on('error', function() {
                console.info('Game server error !!! ');
                me.emit('error', client);
            })
            client.connect(ip, gamePort);
        });
    };
}
util.inherits(HSocket, EventEmitter);
/**
 * event
 * 1. on close
 * 2. on connected
 * 3. on disconnect
 * 4. on error
 */
module.exports = {
    createClient: function (options) {
        return new HSocket(options);
    }
};

//example
if (require.main !== module) return;
var options = {
    ip: '127.0.0.1',
    gamePort: 8888,
    webPort: 3000
}
var client = new HSocket(options);
client.on('connected', function () {
    console.log('connected !!!');
})
