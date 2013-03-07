/***
|''Name:''|IdPlugin|
|''Description:''|generates and retrieves unique ids for tiddlers|
|''Documentation:''|http://id.tiddlyspace.com|
|''Author:''|Tobias Beer / Mario Pietsch|
|''Version:''|0.1|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/IdPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
***/
//{{{

/* allow for a specific prefix */
config.extensions.id = '';

/* retrieves a tiddler id or creates on if not existing */
TiddlyWiki.prototype.tiddlerId = function (tiddler) {
    if (typeof tiddler != String)
        tiddler = tiddler.title;
    var id = store.getValue(tiddler, 'id');
    if (!id)
        store.setValue(tiddler,'id', config.extensions.id + Math.uuid(18) );
}

/* retrieves a tiddler by its id */
TiddlyWiki.prototype.getTiddlerById = function (id) {
    store.forEachTiddler(function(tid){
        if(store.getValue(tid.title,'id') == id)
            return tid;
    });
}


/* id generation below */

(function() {
    /* array of chars to use */
    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''); 

    /* define uuid function */
    Math.uuid = function (len, radix) {
        var chars = CHARS, uuid = new Array(36);
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
        } else {
            var rnd=0, r;
            for (var i = 0; i < 36; i++) {
                if (i==8 || i==13 ||  i==18 || i==23) {
                    uuid[i] = '-';
                } else if (i==14) {
                    uuid[i] = '4';
                } else {
                    if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
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