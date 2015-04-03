node-hgt
========

[![npm version](https://img.shields.io/npm/v/node-hgt.svg)](https://www.npmjs.com/package/node-hgt)

Read and query HGT files, for example from SRTM, for elevation data with high performance.
Optionally, this module can also use cached and automatically download HGT files as required.

## Install

```
npm install --save node-hgt
```

## Usage

Load and query a HGT file:

```js
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11], {
        interpolation: Hgt.nearestNeighbour
    });
    
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


