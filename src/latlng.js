module.exports = function _latLng(ll) {
    if (ll.lat !== undefined && ll.lng !== undefined) {
        return ll;
    }

    return {
        lat: ll[0],
        lng: ll[1]
    };
};
