var fs = require('fs'),
    mmap = require('mmap.js'),
    extend = require('extend'),
    _latLng = require('./latlng');

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

        this._buffer = mmap.alloc(stat.size, mmap.PROT_READ, mmap.MAP_SHARED, fd);
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

module.exports = Hgt;
