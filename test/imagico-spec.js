var test = require('tape'),
    ImagicoElevationDownloader = require('../').ImagicoElevationDownloader;

test('can search Imagico.de', function(t) {
    var dler = new ImagicoElevationDownloader();
    dler.search([57.7, 11.9]).then(function(entries) {
        t.equal(entries[0].link, 'http://www.viewfinderpanoramas.org/dem3/O32.zip');
        t.end();
    }).catch(function(err) {
        t.fail(err);
        t.end();
    });
});

test('can download file', function(t) {
    // Don't run this test by default
    if (!process.env.RUN_ALL_TESTS) {
        return t.end();
    }

    var dler = new ImagicoElevationDownloader(__dirname + '/data/');
    dler.download('N57E011', [57.7, 11.9], function(err) {
        if (!err) {
            t.pass('file was downloaded successfully.');
        } else {
            t.fail(err);
        }
        t.end();
    });
});

test('can handle multiple parallel downloads', function(t) {
    // Don't run this test by default
    if (!process.env.RUN_ALL_TESTS) {
        return t.end();
    }

    var dler = new ImagicoElevationDownloader(__dirname + '/data/');

    t.plan(10);
    for (var i = 0; i < 10; i++) {
        dler.download('N57E011', [57.7, 11.9], function(err) {
            if (!err) {
                t.pass('file was downloaded successfully.');
            } else {
                t.fail(err);
            }
        });
    }
});
