/* global module, asyncTest, start, $, ok, equal, deepEqual, testLog */

(function() {
    var viewer;

    // These values are generated by a script that concatenates all the tile files and records
    // their byte ranges in a multi-dimensional array.

    // eslint-disable-next-line
    var tileManifest  = {"tileRanges":[[[[0,3467]]],[[[3467,6954]]],[[[344916,348425]]],[[[348425,351948]]],[[[351948,355576]]],[[[355576,359520]]],[[[359520,364663]]],[[[364663,374196]]],[[[374196,407307]]],[[[407307,435465],[435465,463663]],[[463663,491839],[491839,520078]]],[[[6954,29582],[29582,50315],[50315,71936],[71936,92703]],[[92703,113385],[113385,133265],[133265,154763],[154763,175710]],[[175710,197306],[197306,218807],[218807,242177],[242177,263007]],[[263007,283790],[283790,304822],[304822,325691],[325691,344916]]]],"totalSize":520078}

    // This tile source demonstrates how you can retrieve individual tiles from a single file
    // using the Range header.
    var customTileSource = {
        width: 1000,
        height: 1000,
        tileWidth: 254,
        tileHeight: 254,
        tileOverlap: 1,
        maxLevel: 10,
        minLevel: 0,
        // The tile URL is always the same. Only the Range header changes
        getTileUrl: function () {
            return '/test/data/testpattern.blob';
        },
        // This method will send the appropriate range header for this tile based on the data
        // in tileByteRanges.
        getTileAjaxHeaders: function(level, x, y) {
            return {
                Range: 'bytes=' + tileManifest.tileRanges[level][x][y].join('-') + '/' + tileManifest.totalSize
            };
        },
    };

    module('AJAX-Tiles', {
        setup: function() {
            $('<div id="example"></div>').appendTo('#qunit-fixture');

            testLog.reset();

            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100, // Faster animation = faster tests,
                loadTilesWithAjax: true,
                ajaxHeaders: {
                    'X-Viewer-Header': 'ViewerHeaderValue'
                }
            });
        },
        teardown: function() {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    asyncTest('tile-loaded event includes AJAX request object', function() {
        var tileLoaded = function tileLoaded(evt) {
            viewer.removeHandler('tile-loaded', tileLoaded);
            ok(evt.tileRequest, 'Event includes tileRequest property');
            equal(evt.tileRequest.readyState, XMLHttpRequest.DONE, 'tileRequest is in completed state');
            start();
        };

        viewer.addHandler('tile-loaded', tileLoaded);
        viewer.open(customTileSource);
    });

    asyncTest('tile-load-failed event includes AJAX request object', function() {
        // Create a tile source that points to a broken URL
        var brokenTileSource = OpenSeadragon.extend({}, customTileSource, {
            getTileUrl: function () {
                return '/test/data/testpattern.blob.invalid';
            }
        });

        var tileLoadFailed = function tileLoadFailed(evt) {
            viewer.removeHandler('tile-load-failed', tileLoadFailed);
            ok(evt.tileRequest, 'Event includes tileRequest property');
            equal(evt.tileRequest.readyState, XMLHttpRequest.DONE, 'tileRequest is in completed state');
            start();
        };

        viewer.addHandler('tile-load-failed', tileLoadFailed);
        viewer.open(brokenTileSource);
    });

    asyncTest('Headers are propagated correctly', function() {
        // Create a tile source that sets a static header for tiles
        var staticHeaderTileSource = OpenSeadragon.extend({}, customTileSource, {
            getTileAjaxHeaders: function() {
                return {
                    'X-Tile-Header': 'TileHeaderValue'
                };
            }
        });

        var expectedHeaders = {
            'X-Viewer-Header': 'ViewerHeaderValue',
            'X-TiledImage-Header': 'TiledImageHeaderValue',
            'X-Tile-Header': 'TileHeaderValue'
        };

        var tileLoaded = function tileLoaded(evt) {
            viewer.removeHandler('tile-loaded', tileLoaded);
            var tile = evt.tile;
            ok(tile, 'tile property exists on event');
            ok(tile.ajaxHeaders, 'Tile has ajaxHeaders property');
            deepEqual(
                tile.ajaxHeaders, expectedHeaders,
                'Tile headers include headers set on Viewer and TiledImage'
            );
            start();
        };

        viewer.addHandler('tile-loaded', tileLoaded);

        viewer.addTiledImage({
            ajaxHeaders: {
                'X-TiledImage-Header': 'TiledImageHeaderValue'
            },
            tileSource: staticHeaderTileSource
        });
    });

    asyncTest('Viewer headers are overwritten by TiledImage', function() {
        // Create a tile source that sets a static header for tiles
        var staticHeaderTileSource = OpenSeadragon.extend({}, customTileSource, {
            getTileAjaxHeaders: function() {
                return {
                    'X-Tile-Header': 'TileHeaderValue'
                };
            }
        });

        var expectedHeaders = {
            'X-Viewer-Header': 'ViewerHeaderValue-Overwritten',
            'X-TiledImage-Header': 'TiledImageHeaderValue',
            'X-Tile-Header': 'TileHeaderValue'
        };

        var tileLoaded = function tileLoaded(evt) {
            viewer.removeHandler('tile-loaded', tileLoaded);
            var tile = evt.tile;
            ok(tile, 'tile property exists on event');
            ok(tile.ajaxHeaders, 'Tile has ajaxHeaders property');
            deepEqual(
                tile.ajaxHeaders, expectedHeaders,
                'TiledImage header overwrites viewer header'
            );
            start();
        };

        viewer.addHandler('tile-loaded', tileLoaded);

        viewer.addTiledImage({
            ajaxHeaders: {
                'X-TiledImage-Header': 'TiledImageHeaderValue',
                'X-Viewer-Header': 'ViewerHeaderValue-Overwritten'
            },
            tileSource: staticHeaderTileSource
        });
    });

    asyncTest('TiledImage headers are overwritten by Tile', function() {

        var expectedHeaders = {
            'X-Viewer-Header': 'ViewerHeaderValue',
            'X-TiledImage-Header': 'TiledImageHeaderValue-Overwritten',
            'X-Tile-Header': 'TileHeaderValue'
        };

        var tileLoaded = function tileLoaded(evt) {
            viewer.removeHandler('tile-loaded', tileLoaded);
            var tile = evt.tile;
            ok(tile, 'tile property exists on event');
            ok(tile.ajaxHeaders, 'Tile has ajaxHeaders property');
            deepEqual(
                tile.ajaxHeaders, expectedHeaders,
                'Tile header overwrites TiledImage header'
            );
            start();
        };

        viewer.addHandler('tile-loaded', tileLoaded);

        // Create a tile source that sets a static header for tiles
        var staticHeaderTileSource = OpenSeadragon.extend({}, customTileSource, {
            getTileAjaxHeaders: function() {
                return {
                    'X-TiledImage-Header': 'TiledImageHeaderValue-Overwritten',
                    'X-Tile-Header': 'TileHeaderValue'
                };
            }
        });

        viewer.addTiledImage({
            ajaxHeaders: {
                'X-TiledImage-Header': 'TiledImageHeaderValue'
            },
            tileSource: staticHeaderTileSource
        });
    });
})();
