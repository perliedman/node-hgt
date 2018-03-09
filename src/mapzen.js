//Author: Claudio Heidel 

var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    extend = require('extend'),
    Promise = require('promise'),
    request = require('request'),
    _latLng = require('./latlng'),
     util = require('util'),
     zlib = require('zlib');

function MapzenElevationDownloader(cacheDir, options) {
    this.options = extend({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

function zeroPad(v, l) {
	var r = v.toString();
	while (r.length < l) {
		r = '0' + r;
	}
	return r;
};

MapzenElevationDownloader.prototype.download = function(tileKey, latLng, cb) {
    var cleanup = function() {
            delete this._downloads[tileKey];
            fs.unlinkSync(tempPath);
        }.bind(this),
        download = this._downloads[tileKey],
        tempPath,
        stream;

    if (!download) {
        download = this.search(latLng)
            .then(function(tileZips) {
                if (!tileZips.length) {
                    throw new Error('No tiles found for latitude ' + latLng.lat + ', longitude ' + latLng.lng);
                }

                tempPath = path.join(os.tmpdir(), tileZips[0].name);

                stream = fs.createWriteStream(tempPath);

                return this._download(tileZips[0].link, stream);
            }.bind(this))
            .then(function() {
                return this._unzip(tempPath, this._cacheDir);
            }.bind(this))
            .then(cleanup)
            .catch(function(err) {
                cleanup();
                throw err;
            });
        this._downloads[tileKey] = download;
    }

    download.then(function() {
        cb(undefined);
    }).catch(function(err) {
        cb(err);
    });
};

MapzenElevationDownloader.prototype.search = function(latLng) {

    return new Promise(function(fulfill, reject) {
		var path = util.format('%s%s',
			latLng.lat < 0 ? 'S' : 'N',
			zeroPad(Math.abs(Math.floor(latLng.lat)), 2));

		var key = util.format('%s%s%s%s',
			latLng.lat < 0 ? 'S' : 'N',
			zeroPad(Math.abs(Math.floor(latLng.lat)), 2),
			latLng.lng < 0 ? 'W' : 'E',
			zeroPad(Math.abs(Math.floor(latLng.lng)), 3));

		var url = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/" + path + "/" + key + ".hgt.gz";  

		try {
			fulfill([
				{'link': url,
				 'name': key + '.hgt.gz',
				 'title': ''
				}]);
		} catch (e) {
			reject('error: ' + e.toString());
		}

    });
};

MapzenElevationDownloader.prototype._download = function(url, stream) {
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

MapzenElevationDownloader.prototype._unzip = function(zipPath, targetPath) {
    return new Promise(function(fulfill, reject) {
		var unzip = zlib.createUnzip();  
		var inp = fs.createReadStream(zipPath);  
		var out = fs.createWriteStream(targetPath + require('path').basename(zipPath).replace(".gz",""));  

  		try {
			inp.pipe(unzip).pipe(out).on('finish', fulfill); 
		} catch (e) {
			reject(e);
		}
    });
};

module.exports = MapzenElevationDownloader;
