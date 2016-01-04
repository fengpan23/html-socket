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
            let client = new Client();
            client.on('request', function (id, event, content) {
                ws.send(JSON.stringify({event: event, content: content}));
            }).on('connected', function() {
                console.info('connected: ' + ip, ': ', gamePort);

                me.emit('connected');
            }).on('disconnect', function () {
                me.emit('disconnect');
            }).on('error', function() {
                console.log('client error!!!');

                me.emit('error', client);
            })
            client.connect(ip, gamePort);

            ws.on('message', function incoming(message) {
                console.log('incoming message : ', message);
                try{
                    let data = JSON.parse(message);
                    if(data.event){
                        client.send(0, data.event, data.content);
                    }
                }catch(e){
                    console.error('parse incoming message error !!');
                    me.emit('error', 'incoming data error !')
                }
            });
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
