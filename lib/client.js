"use strict";
const EventEmitter = require('events').EventEmitter;
const net = require('net');
const util = require('util');
const NetProtocol = require('./proto');

const TRANSPORT_CODE = 3;

class NetClient {
    constructor() {
        EventEmitter.call(this);
        this.connected = false;
        this.ready = false;
        this.smooth = false;
        this.received = {};
        this.buffer = [];
        this.proto = new NetProtocol();

        let me = this;
        this.proto.on('connect', function (socketid) {
            me.id = socketid;
            me._writeRaw(me.proto.pack(null, me.proto.opcodemap.get('connect')));
        }).on('connected', function () {
            me.ready = true;
            me.interval = setInterval(function(){
                me._writeRaw(me.proto.pack(null, me.proto.opcodemap.get('ack')));
            },1000);
            me.emit('connected');
        }).on('disconnect', function(){
            me._close();
        });
    };

    /**
     * @param ip
     * @param port
     */
    connect(ip, port) {
        if (this.connected === true)return false;
        this.socket = new net.createConnection(port, ip || '127.0.0.1');
        this.ready = false;
        let me = this;
        this.socket.on('connect', function () {
            me.connected = true;
            me.socket.on('error', function (error) {
                me._error(error, me);
            }).on('data', function (data) {
                me._receive(data);
            }).on('drain', function () {
                me._retryWriter();
            }).on('end', function () {
                me.smooth = true;
            }).on('close', function () {
                me._disconnect(me);
            });
        });
        this.connected = true;
    };

    /**
     * @param id
     * @param event
     * @param content
     */
    send(id, event, content) {
        if (event){
            this._writeRaw(this.proto.pack({id: id, event: event, content: content}, TRANSPORT_CODE));
        }
    };

    _close() {
        clearTimeout(this.interval);
        this.ready = false;
        this.smooth = true;
        this.socket.end();
        this.socket.destroy();
        this.buffer = [];
    };

    _disconnect() {
        this._close();
        this.connected = false;
        this.emit('disconnect', this.smooth);
    };

    _receive(transmit) {
        if (!this.proto.append(transmit))this.disconnect();
        while (this.received = this.proto.get()) {
            if (!this.received.hasOwnProperty('id'))
                this.received.id = 0;
            if (this.received.hasOwnProperty('event') && this.received.hasOwnProperty('content')) {
                if (this.ready === true){
                    this.emit('request', this.received.id, this.received.event, this.received.content);
                }else{
                    console.log('this is not ready !!!!!!');
                }
            }
        }
    };

    _writeRaw(transmit) {
        if (!this.socket.write(transmit))
            this.buffer.push(transmit);
    };

    _retryWriter() {
        let buffers = this.buffer;
        this.buffer = [];
        for (let buffer of buffers) {
            if (!this.socket.write(buffer))
                this.buffer.push(buffer);
        }
    };

    _error(error, client) {
        this.emit('error', error.code, client);
    };

}

/**
 * this event
 * 1. disconnect
 * 2. request    @data (id, event, content)
 * 3. error      @data (code, client)
 * 4. connected
 */
util.inherits(NetClient, EventEmitter);
module.exports = function () {
    return new NetClient()
};
