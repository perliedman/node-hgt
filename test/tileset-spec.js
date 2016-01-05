var test = require('tape'),
    os = require('os'),
    fs = require('fs'),
    rimraf = require('rimraf'),
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
    TileSet = require('../').TileSet;

test('can create tileset', function(t) {
    var tileset = new TileSet(__dirname + '/data/');
    tileset.destroy();
    t.end();
});

test('can query tileset', function(t) {
    var tileset = new TileSet(__dirname + '/data/');
    tileset.getElevation([57.7, 11.9], function(err, elevation) {
        if (err) {
            t.fail('getElevation failed: ' + err.message);
        } else {
            almostEqual(t, elevation, 16);
        }
        tileset.destroy();
        t.end();
    });
});

test('can\'t query non-existing tiles without downloader', function(t) {
    var tileset = new TileSet(__dirname + '/data/', {downloader:null});
    tileset.getElevation([52.7, 11.9], function(err, elevation) {
        if (!err) {
            t.fail('getElevation for non-existing tile returned: ' + elevation);
        } else {
            t.ok(true, 'getElevation gave an error for non-existing tile.');
        }
        tileset.destroy();
        t.end();
    });
});

test('can query non-existing tiles with default downloader', function(t) {
    var tmpDir = os.tmpDir() + '/data' + Date.now();
    fs.mkdir(tmpDir, function(error) {
        if (error) {
            t.fail(error);
            return;
        }

        var tileset = new TileSet(tmpDir);
        tileset.getElevation([52.7, 11.9], function(err, elevation) {
            if (!err) {
                t.ok(true, 'getElevation for non-existing tile returned: ' + elevation);
            } else {
                t.fail('getElevation gave an error for non-existing tile: ' + err);
            }
            tileset.destroy();
            t.end();
            rimraf(tmpDir, function(){});
        });
    });
});