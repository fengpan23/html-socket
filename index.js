"use strict";
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const WebSocketServer = require('ws').Server;
const Client = require('./lib/client');

class HSocket{
    constructor(ip, port) {
        EventEmitter.call(this);
        ip = ip || '127.0.0.1', port = port || 8888;
        this.client = new Client();
        let me = this;
        this.client.on('request', function (id, event, content) {
            console.log('id, event, content', id, event, content);
        }).on('connected', function () {
            me.emit('connected', me.client);
            console.info('connected: ' + ip, ': ', port);
        }).on('disconnect', function () {
            me.emit('disconnect', me.client);
        }).on('error', function () {
            console.log('client error@!!');
        })
        this.client.connect(ip, port);
    };

    send(event, content) {
        this.client.send(1, event, content);
    };
}
util.inherits(HSocket, EventEmitter);
/**
 * event
 * 1. on data
 * 2. on close
 * 3. on connected
 * 4. on disconnect
 */
module.exports = {
    createClient: function () {
        return new HSocket();
    }
};

//example
if (require.main !== module) return;
var client = new HSocket('127.0.0.1', 8888);
client.on('connected', function () {
    client.send("login", {tableid : 68, gameid : 100006, session : 'whx1'});
    client.send('sitdown', {seatindex: 1});
})
