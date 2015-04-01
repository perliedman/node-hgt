var test = require('tape'),
    almostEqual = function(t, actual, expected, delta, msg) {
        var d = Math.abs(actual - expected);
        delta = delta || 1e-9;
        if (d > delta) {
            t.equal(actual, expected, msg);
        } else {
            t.ok(true, 'Should be almost equal');
        }
    },
    Hgt = require('../').Hgt;


test('can open hgt', function(t) {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]);
    hgt.close();
    t.end();
});

test('can query hgt nearestneighbour', function(t) {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11], {
        interpolation: Hgt.nearestNeighbour
    });
    
    t.equal(hgt.getElevation([57, 11]), 0);
    t.equal(hgt.getElevation([57.7, 11.9]), 16);
    hgt.close();
    t.end();
});

test('can query hgt bilinear', function(t) {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11], {
        interpolation: Hgt.bilinear
    });
    
    t.equal(hgt.getElevation([57, 11]), 0);
    almostEqual(t, hgt.getElevation([57.7, 11.9]), 16);
    hgt.close();
    t.end();
});
