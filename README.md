node-hgt
========

[![npm version](https://img.shields.io/npm/v/node-hgt.svg)](https://www.npmjs.com/package/node-hgt)

Read and query HGT files, for example from SRTM, for elevation data with high performance.
Optionally, this module can also use cached and automatically download HGT files as required.

node-hgt tries to be reasonably performant. A rough benchmark shows it can do 1.8M elevation calculations
per second on my years old laptop.

## Install

```
npm install --save node-hgt
```

## Usage

Load and query a HGT file:

```js
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]);
    
    // Return elevation in meters above sea level.
    // By default, elevation is interpolated bilinearly.
    hgt.getElevation([57, 11])
```

Use a cache directory of HGT files for querying. Missing data will be downloaded
using the elevation data index from [imagico.de](http://www.imagico.de/map/demsearch.php),
by default.

```js
    var tileset = new TileSet('./data/');
    tileset.getElevation([57.7, 11.9], function(err, elevation) {
        if (err) {
            console.log('getElevation failed: ' + err.message);
        } else {
            console.log(elevation);
        }
    });
```

There's also a synchronous tile set, if you know before hand which area you will query:

```js
    var tileset = new SyncTileSet('./data/', [57, 11], [58, 12], function(err) {
        if (err) {
            console.log(err);
            return;
        }

        // All tiles are loaded (or downloaded, if they were not already on disk)
        // and queries can be made synchronous.

        var elevation = tileset.getElevation([57.7, 11.9]);
                console.log(elevation);
            }
        });
    });
```
