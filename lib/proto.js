"use strict";
const zlib = require('zlib');
const util = require('util');
const EventEmitter = require('events');

class _proto {
    constructor() {
        this.version = 1;
        this.read = 'readUInt8';
        this.write = 'writeUInt8';
        this.readsize = 'readUInt32BE';
        this.writesize = 'writeUInt32BE';
        this.len = 10;
        this.opcode = [['disconnect', 100], ['connect', 110], ['reconnect', 120], ['connected', 130], ['ack', 140], ['ping', 150], ['pong', 160], ['pushtoall', 170]];
        this.opcodemap = new Map([[100, 'disconnect'], [110, 'connect'], [120, 'reconnect'], [130, 'connected'], [140, 'ack'], [150, 'ping'], [160, 'pong'], [170, 'pushtoall']]);
    }

    _deflate(data) {
        let result = null;
        try {
            result = zlib.deflateRawSync(data)
        } catch (e) {
            console.error('deflate error !');
        }
        return result;
    }

    _inflate(data) {
        let result = null;
        try {
            result = zlib.inflateRawSync(data)
        } catch (e) {
            console.error('inflate error !');
        }
        return result;
    }

    parse(data, pcode) {
        let result = (code, _data)=> {
            if (!!code) return {code: code, data: _data};
            return null;
        };
        let tcode = +pcode % 10;
        let ccode = +pcode - tcode;
        let _data = null;
        if(data) {
            switch (tcode) {
                case 0:
                    _data = data.toString();
                    break;
                case 1:
                    _data = this._inflate(data).toString();
                    break;
                case 2:
                    _data = JSON.parse(data);
                    break;
                case 3:
                    _data = JSON.parse(this._inflate(data));
                    break;
            }
        }
        if (this.opcodemap.has(ccode)) {
            return result(this.opcodemap.get(ccode), _data);
        } else {
            return result('data', _data);
        }
    };

    compile(data, pcode) {
        if(data) {
            switch(pcode % 10) {
                case 0:
                    return data.toString();
                case 1:
                    return this._deflate(data.toString());
                case 2:
                    return JSON.stringify(data);
                case 3:
                    return this._deflate(JSON.stringify(data));
                default :
                    return null;
            }
        }
        return null;
    }
}

let proto = new _proto();
const PROTO_TIMEOUT = 5000;

class NetProto{
    constructor() {
        EventEmitter.call(this);
        this.length = -1;
        this.size = 0;
        this.buffer = new Buffer(0);
        this.opcode = -1;
        this.error = false;
        this.opcodemap = new Map(proto.opcode);
        this.lastget = Date.now();

        let me = this;
        this.heartbeat = setInterval(function() {
            if (Date.now() - me.lastget > PROTO_TIMEOUT){
                clearInterval(me.heartbeat);
                me.emit('timeout');
            }
        }, PROTO_TIMEOUT);
    };

    pack(data, opcode) {
        let header = new Buffer(proto.len);
        let result = proto.compile(data, opcode);
        header[proto.write](proto.version, 0);
        header[proto.write](opcode, 5);
        header[proto.writesize](0, 6);
        if (result === null) {
            header[proto.writesize](0, 1);
            return header;
        } else {
            header[proto.writesize](result.length, 1);
            return Buffer.concat([header, new Buffer(result, "binary")]);
        }
    };

    append(buff) {
        if (!Buffer.isBuffer(buff) || buff.length < 0)
            return false;
        if (this.buffer = Buffer.concat([this.buffer, buff], this.size + buff.length)) {
            this.size += buff.length;
            this._refresh();
            return true;
        }
    };

    get() {
        this._refresh();
        if (this.length < 0 || this.size < proto.len)return false;
        let result = null;
        if (this.length > 0) {
            let data = new Buffer(this.length);
            if (this.buffer.copy(data, 0, proto.len, this.length + proto.len)) {
                result = proto.parse(data, this.opcode);
                this.size -= data.length + proto.len;
            }
        } else {
            result = proto.parse(null, this.opcode);
            this.size -= proto.len;
        }
        if (!result) {
            this.emit('disconnect');
            return false;
        }
        this.buffer = this.buffer.slice(this.length + proto.len);
        this.length = -1;
        this.opcode = -1;
        this.lastget = Date.now();
        switch(result.code) {
            case 'data':
                return result.data;
            case 'connect':
                this.emit('connect', result.data);
                return false;
            case 'reconnect':
                this.emit('reconnect', result.data);
                return false;
            case 'connected':
                this.emit('connected', result.data);
                return false;
            case 'disconnect':
                this.emit('disconnect', result.data);
                return false;
            case 'ack' :
                return false;
            case 'ping' :
                this.emit('reply', me.opcodemap.get('pong'));
                return false;
            case 'pushtoall' :
                this.emit('pushtoall', result.data);
                return false;
            default :
                return false;
        }
    };

    _refresh() {
        if (this.size >= proto.len && this.length < 0) {
            let version = this.buffer[proto.read](0);
            if (version > proto.version)return false;
            this.length = this.buffer[proto.readsize](1);
            this.opcode = this.buffer[proto.read](5);
        }
    };
}

/**
 * this event
 * 1. disconnect
 * 2. timeout
 */
util.inherits(NetProto, EventEmitter);
module.exports = function () {
    return new NetProto();
};
