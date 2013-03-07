/***
|''Name:''|IdPlugin|
|''Description:''|» provides {{{store.tiddlerId(tiddlerOrTitle)}}} to persist and retrieve unique tiddlers ids<br>» provides {{{store.getTiddlerById(id)}}} to retrieve tiddlers by their id |
|''Documentation:''|http://id.tiddlyspace.com|
|''Author:''|Tobias Beer / Mario Pietsch|
|''Version:''|1.1.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/IdPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion:''|2.6.5|
|''Implements''|http://www.broofa.com/Tools/Math.uuid.js|
***/
//{{{
/* returns the tiddler id */
Tiddler.prototype.getId = function () {
    //return the id
    return this.fields['id'];
}

/* sets a tiddler id when undefined
arguments (all optional)...
    length:  the id length / default: 21
    base:    the id base   / default: 64                                           */
Tiddler.prototype.setId = function (length, base) {
    //get id
    var id = this.fields['id'];
    //not defined yet?
    if (!id) {
        //set the id using a generated uuid
        this.fields['id'] = Math.uuid(length || 21, base);
        //return the id when set
        return this.id;
    }
}

/* retrieves a tiddler id or creates one if not existing
arguments:
    tiddler: title (string) or tiddler
    length, base => see Tiddler.setId()
returns:
    the id                                                                         */

TiddlyWiki.prototype.tiddlerId = function (tiddler, length, base) {
    var
        //when tiddler given use tiddler otherwise get via title
        t = typeof tiddler != 'string' ? tiddler : this.fetchTiddler(tiddler),
        //retrieve Id
        id = t.fields['id'];

    //no id yet?
    if (!id) {
        //let the tiddler set its id
        id = t.setId(length, base);
        console.log(id);
        //save the tiddler
        this.saveTiddler(t);
    }
    //return the id
    return id;
}

/* retrieves a tiddler by its id */
TiddlyWiki.prototype.getTiddlerById = function (id) {
    var tiddler;
    //loop all tids
    this.forEachTiddler(function (title, t) {
        //tiddler has this id?
        if (id === t.fields['id']) {
            //set reference
            tiddler = t;
            //exit loop
            return false;
        }
    });
    //return the tiddler if found
    return tiddler;
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
            }
        }

        return uuid.join('');
    };

})();
//}}}