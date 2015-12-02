var util = require('util'),
    zeroPad = function(v, l) {
        var r = v.toString();
        while (r.length < l) {
            r = '0' + r;
        }
        return r;
    };

module.exports = function(latLng) {
    return util.format('%s%s%s%s',
        latLng.lat < 0 ? 'S' : 'N',
        zeroPad(Math.abs(Math.floor(latLng.lat)), 2),
        latLng.lng < 0 ? 'W' : 'E',
        zeroPad(Math.abs(Math.floor(latLng.lng)), 3));
};
