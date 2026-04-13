var fs = require('fs'),
    extend = require('extend'),
    _latLng = require('./latlng');

var HGT_VOID = -32768;

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

        this._buffer = fs.readFileSync(fd);
        this._swLatLng = _latLng(swLatLng);
    } finally {
        fs.closeSync(fd);
    }
}

Hgt.nearestNeighbour = function(row, col) {
    var elevation = this._rowCol(Math.round(row), Math.round(col));
    return elevation === HGT_VOID ? null : elevation;
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
        v1, v2;

    if (v00 !== HGT_VOID && v10 !== HGT_VOID) {
        v1 = avg(v00, v10, colFrac);
    } else if (v00 !== HGT_VOID) {
        v1 = v00;
    } else if (v10 !== HGT_VOID) {
        v1 = v10;
    } else {
        v1 = null;
    }

    if (v01 !== HGT_VOID && v11 !== HGT_VOID) {
        v2 = avg(v01, v11, colFrac);
    } else if (v01 !== HGT_VOID) {
        v2 = v01;
    } else if (v11 !== HGT_VOID) {
        v2 = v11;
    } else {
        v2 = null;
    }

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

    if (v1 !== null && v2 !== null) {
        return avg(v1, v2, rowFrac);
    } else if (v1 !== null) {
        return v1;
    } else if (v2 !== null) {
        return v2;
    } else {
        return null;
    }
};

Hgt.prototype.destroy = function() {
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
