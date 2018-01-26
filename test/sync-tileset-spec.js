var test = require('tape'),
    almostEqual = function(t, actual, expected, delta, msg) {
        var d = Math.abs(actual - expected);
        delta = delta || 1e-9;
        msg = msg || 'Should be almost equal';
        if (d > delta) {
            t.equal(actual, expected, msg);
        } else {
            t.ok(true, msg);
        }
    },
    SyncTileSet = require('../').SyncTileSet;

test('can create synchronous tileset', function(t) {
    var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
        if (err) {
            t.fail(err);
        } else {
            tileset.destroy();
            t.end();
        }
    });
});

test('can query synchronous tileset', function(t) {
    var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
        if (err) {
            t.fail(err);
            return;
        }

        var elevation = tileset.getElevation([57.7, 11.9]);
        almostEqual(t, elevation, 13);
        tileset.destroy();
        t.end();
    });
});

test('can\'t query synchronous non-existing tiles', function(t) {
    var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
        if (err) {
            t.fail(err);
            return;
        }
        var elevation;
        try {
            elevation = tileset.getElevation([52.7, 11.9]);
        } catch (e) {
            t.ok(true, 'getElevation gave an error for non-existing tile.');
            tileset.destroy();
            t.end();
            return;
        }

        t.fail('getElevation for non-existing tile returned: ' + elevation);
    });
});
