/***
|''Name:''|IdPlugin|
|''Description:''|» provides {{{store.tiddlerId(tiddlerOrTitle)}}} to persist and retrieve unique tiddlers ids<br>» provides {{{store.getTiddlerById(id)}}} to retrieve tiddlers by their id |
|''Documentation:''|http://id.tiddlyspace.com|
|''Author:''|Tobias Beer / Mario Pietsch|
|''Version:''|1.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/IdPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''Implements''|http://www.broofa.com/Tools/Math.uuid.js|
***/
//{{{

/* allow for a specific prefix */
config.extensions.idPrefix = '';

/* retrieves a tiddler id or creates on if not existing */
TiddlyWiki.prototype.tiddlerId = function (tiddler) {
    if (typeof tiddler != 'string')
        tiddler = tiddler.title;
    var id = store.getValue(tiddler, 'id');
    if (!id) {
        id = config.extensions.idPrefix + Math.uuid(18);
        store.setValue(tiddler, 'id', id);
    }
    return id;
}

/* retrieves a tiddler by its id */
TiddlyWiki.prototype.getTiddlerById = function (id) {
    var t;
    store.forEachTiddler(function (title, tiddler) {
        if (id === store.getValue(title, 'id') ) {
            t = tiddler;
            return false;
        }
    });
    return t;
};


/*!
Shortened version by PMario (1.0 - 2011.05.22) of...
http://www.broofa.com/Tools/Math.uuid.js

Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/
(function () {
    // Private array of chars to use
    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

    Math.uuid = function (len, radix) {
        var chars = CHARS, uuid = new Array(36);
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            var rnd = 0, r;
            for (var i = 0; i < 36; i++) {
                if (i == 8 || i == 13 || i == 18 || i == 23) {
                    uuid[i] = '-';
                } else if (i == 14) {
                    uuid[i] = '4';
                } else {
                    if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                    r = rnd & 0xf;
                    rnd = rnd >> 4;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            } // else
        }

        return uuid.join('');
    };

})();
//}}}