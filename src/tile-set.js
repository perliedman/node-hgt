var path = require('path'),
    fs = require('fs'),
    extend = require('extend'),
    LRU = require('lru-cache'),
    util = require('util'),
    Hgt = require('./hgt'),
    ImagicoElevationDownloader = require('./imagico'),
    _latLng = require('./latlng');

function TileSet(tileDir, options) {
    this.options = extend({}, {
        loadTile: function(tileDir, latLng, cb) {
            var ll = {
                    lat: Math.floor(latLng.lat),
                    lng: Math.floor(latLng.lng)
                },
                tileKey = this._tileKey(ll),
                tilePath = path.join(tileDir, tileKey + '.hgt');
            fs.exists(tilePath, function(exists) {
                var tile;
                if (exists) {
                    setImmediate(function() {
                        try {
                            tile = new Hgt(tilePath, ll);
                            // TODO: Hgt creation options
                            cb(undefined, tile);
                        } catch (e) {
                            cb({message: 'Unable to load tile "' + tilePath + '": ' + e, stack: e.stack});
                        }
                    });
                } else if (this.options.downloader) {
                    this.options.downloader.download(tileKey, latLng, function(err) {
                        if (!err) {
                            cb(undefined, new Hgt(tilePath, ll));
                        } else {
                            cb(err);
                        }
                    });
                } else {
                    setImmediate(function() {
                        cb({message: 'Tile does not exist: ' + tilePath});
                    });
                }
            }.bind(this));
        },
        downloader: new ImagicoElevationDownloader(tileDir)
    }, options);
    if (options && options.downloader === undefined) {
        this.options.downloader = undefined;
    }
    this._tileDir = tileDir;
    this._tileCache = LRU({
        max: 1000,
        dispose: function (key, n) {
            if(n) {
                n.destroy();
            }
        }
    });
    this._loadingTiles = {};
}

TileSet.prototype.destroy = function() {
    this._tileCache.reset();
    delete this._tileCache;
};

TileSet.prototype.getElevation = function(latLng, cb) {
    var getTileElevation = function(tile, ll) {
            cb(undefined, tile.getElevation(ll));
        },
        ll = _latLng(latLng),
        tileKey = this._tileKey(ll),
        tile = this._tileCache.get(tileKey);

    if (tile) {
        setImmediate(function() {
            getTileElevation(tile, ll);
        });
    } else {
        this._loadTile(tileKey, ll, function(err, tile) {
            if (!err) {
                getTileElevation(tile, ll);
            } else {
                cb(err);
            }
        });
    }
};

TileSet.prototype._loadTile = function(tileKey, latLng, cb) {
    var loadQueue = this._loadingTiles[tileKey];

    if (!loadQueue) {
        loadQueue = [];
        this._loadingTiles[tileKey] = loadQueue;
        this.options.loadTile.call(this, this._tileDir, latLng, function(err, tile) {
            var q = this._loadingTiles[tileKey];
            if(!err) {
                this._tileCache.set(tileKey, tile);
            }
            q.forEach(function(cb) {
                if (err) {
                    cb(err);
                } else {
                    cb(undefined, tile);
                }
            });
            delete this._loadingTiles[tileKey];
        }.bind(this));
    }

    loadQueue.push(cb);
};

TileSet.prototype._tileKey = function(latLng) {
    var zeroPad = function(v, l) {
        var r = v.toString();
        while (r.length < l) {
            r = '0' + r;
        }
        return r;
    };

    return util.format('%s%s%s%s',
        latLng.lat < 0 ? 'S' : 'N',
        zeroPad(Math.abs(Math.floor(latLng.lat)), 2),
        latLng.lng < 0 ? 'W' : 'E',
        zeroPad(Math.abs(Math.floor(latLng.lng)), 3));
};

module.exports = TileSet;
