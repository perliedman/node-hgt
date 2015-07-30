var fs = require('fs'),
    os = require('os'),
    util = require('util'),
    path = require('path'),
    mmap = require('mmap'),
    Promise = require('promise'),
    request = require('request'),
    yauzl = require('yauzl'),
    extend = require('extend');
    LRU = require("lru-cache");

function _latLng(ll) {
    if (ll.lat !== undefined && ll.lng !== undefined) {
        return ll;
    }

    return {
        lat: ll[0],
        lng: ll[1]
    };
}

function Hgt(path, swLatLng, options) {
    var fd = fs.openSync(path, 'r'),
        stat;

    try {
        stat = fs.fstatSync(fd);

        this.options = extend({}, {
            interpolation: Hgt.bilinear
        }, options);


        if (stat.size === 12967201 * 2) {
            this._resolution = 1;
            this._size = 3601;
        } else if (stat.size === 1442401 * 2) {
            this._resolution = 3;
            this._size = 1201;
        } else {
            throw new Error('Unknown tile format (1 arcsecond and 3 arcsecond supported).');
        }

        this._buffer = mmap(stat.size, mmap.PROT_READ, mmap.MAP_SHARED, fd);
        this._swLatLng = _latLng(swLatLng);
        this._fd = fd;

    } catch (e) {
        fs.closeSync(fd);
        throw e;
    }
}

Hgt.nearestNeighbour = function(row, col) {
    return this._rowCol(Math.round(row), Math.round(col));
};

Hgt.bilinear = function(row, col) {
    var avg = function(v1, v2, f) {
            return v1 + (v2 - v1) * f;
        },
        rowLow = Math.floor(row),
        rowHi = rowLow + 1,
        rowFrac = row - rowLow,
        colLow = Math.floor(col),
        colHi = colLow + 1,
        colFrac = col - colLow,
        v00 = this._rowCol(rowLow, colLow),
        v10 = this._rowCol(rowLow, colHi),
        v11 = this._rowCol(rowHi, colHi),
        v01 = this._rowCol(rowHi, colLow),
        v1 = avg(v00, v10, colFrac),
        v2 = avg(v01, v11, colFrac);

    // console.log('row = ' + row);
    // console.log('col = ' + col);
    // console.log('rowLow = ' + rowLow);
    // console.log('rowHi = ' + rowHi);
    // console.log('rowFrac = ' + rowFrac);
    // console.log('colLow = ' + colLow);
    // console.log('colHi = ' + colHi);
    // console.log('colFrac = ' + colFrac);
    // console.log('v00 = ' + v00);
    // console.log('v10 = ' + v10);
    // console.log('v11 = ' + v11);
    // console.log('v01 = ' + v01);
    // console.log('v1 = ' + v1);
    // console.log('v2 = ' + v2);

    return avg(v1, v2, rowFrac);
};

Hgt.prototype.destroy = function() {
    this._buffer.unmap();
    fs.closeSync(this._fd);
    delete this._buffer;
};

Hgt.prototype.getElevation = function(latLng) {
    var size = this._size - 1,
        ll = _latLng(latLng),
        row = (ll.lat - this._swLatLng.lat) * size,
        col = (ll.lng - this._swLatLng.lng) * size;

    if (row < 0 || col < 0 || row > size || col > size) {
        throw new Error('Latitude/longitude is outside tile bounds (row=' +
            row + ', col=' + col + '; size=' + size);
    }

    return this.options.interpolation.call(this, row, col);
};

Hgt.prototype._rowCol = function(row, col) {
    var size = this._size,
        offset = ((size - row - 1) * size + col) * 2;

    return this._buffer.readInt16BE(offset);
};

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
                    try {
                        tile = new Hgt(tilePath, ll);
                        // TODO: Hgt creation options
                        cb(undefined, tile);
                    } catch (e) {
                        cb({message: 'Unable to load tile "' + tilePath + '": ' + e});
                    }
                } else if (this.options.downloader) {
                    this.options.downloader.download(tileKey, latLng, function(err) {
                        if (!err) {
                            cb(undefined, new Hgt(tilePath, ll));
                        } else {
                            cb(err);
                        }
                    });
                } else {
                    cb({message: 'Tile does not exist: ' + tilePath});
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
        getTileElevation(tile, ll);
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

function ImagicoElevationDownloader(cacheDir, options) {
    this.options = extend({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

ImagicoElevationDownloader.prototype.download = function(tileKey, latLng, cb) {
    var cleanup = function(err) {
            delete this._downloads[tileKey];
            fs.unlinkSync(tempPath);
        }.bind(this),
        download = this._downloads[tileKey],
        tempPath,
        stream;

    if (!download) {
        download = this.search(latLng)
            .then(function(tileZips) {
                tempPath = path.join(os.tmpdir(), tileZips[0].name);
                stream = fs.createWriteStream(tempPath);
                return this._download(tileZips[0].link, stream);
            }.bind(this))
            .then(function() {
                return this._unzip(tempPath, this._cacheDir);
            }.bind(this))
            .then(cleanup)
            .catch(cleanup);
        this._downloads[tileKey] = download;
    }

    download.then(function() {
        cb(undefined);
    }).catch(function(err) {
        cb(err);
    });
};

ImagicoElevationDownloader.prototype.search = function(latLng) {
    var ll = _latLng(latLng);
    return new Promise(function(fulfill, reject) {
        request('http://www.imagico.de/map/dem_json.php?date=&lon=' +
            ll.lng + '&lat=' + ll.lat + '&lonE=' + ll.lng +
            '&latE=' + ll.lat + '&vf=1', function(err, response, body) {
                if (!err && response.statusCode === 200) {
                    var data = JSON.parse(body);
                    fulfill(data);
                } else {
                    reject(err || response);
                }
            });
    });
};

ImagicoElevationDownloader.prototype._download = function(url, stream) {
    return new Promise(function(fulfill, reject) {
        request(url, function(err, response) {
            if (!err && response.statusCode === 200) {
                fulfill(stream);
            } else {
                reject(err || response);
            }
        }).pipe(stream);
    });
};

ImagicoElevationDownloader.prototype._unzip = function(zipPath, targetPath) {
    return new Promise(function(fulfill, reject) {
        var unzips = [];

        yauzl.open(zipPath, function(err, zipfile) {
            if (err) {
                reject(err);
                return;
            }
            zipfile
            .on('entry', function(entry) {
                if (/\/$/.test(entry.fileName)) {
                    return;
                }
                zipfile.openReadStream(entry, function(err, readStream) {
                    var lastSlashIdx = entry.fileName.lastIndexOf('/'),
                        fileName = entry.fileName.substr(lastSlashIdx + 1),
                        filePath = path.join(targetPath, fileName);
                    if (err) {
                        reject(err);
                        return;
                    }

                    unzips.push(new Promise(function(fulfill, reject) {
                        readStream.on('end', fulfill);
                        readStream.on('error', reject);
                    }));
                    readStream.pipe(fs.createWriteStream(filePath));
                });
            });
            zipfile.on('end', function() {
                Promise.all(unzips)
                    .then(function() {
                        fulfill();
                    })
                    .catch(reject);
            });
        });
    });
};

module.exports = {
    Hgt: Hgt,
    TileSet: TileSet,
    ImagicoElevationDownloader: ImagicoElevationDownloader
};
