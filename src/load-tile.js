var fs = require('fs'),
    path = require('path'),
    Hgt = require('./hgt'),
    tileKey = require('./tile-key');

module.exports = function(tileDir, latLng, cb) {
    var ll = {
            lat: Math.floor(latLng.lat),
            lng: Math.floor(latLng.lng)
        },
        key = tileKey(ll),
        tilePath = path.join(tileDir, key + '.hgt');
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
            this.options.downloader.download(key, latLng, function(err) {
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
};
