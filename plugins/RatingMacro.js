/***
|''Name:''|RatingMacro|
|''Description''|allows to rate tiddlers. e.g. via stars|
|''Version:''|0.1.0|
|''Type''|macro|
|''Author:''|[[TobiasBeer]]|
|''Info:''|http://lastfm.tiddlyspot.com/#RatingMacroInfo [[RatingMacroInfo]]|
|''Source:''|http://lastfm.tiddlyspot.com/#RatingMacro [[RatingMacro]]|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''Feedback:''|[[here|http://groups.google.com/group/tiddlywiki/browse_frm/thread/35b6e27237f1749b]]|
|''~CoreVersion''|2.2|
Inspired by http://sinojellyempty.tiddlyspot.com/#FiveStarsPlugin
!Code
***/

//{{{
config.macros.rating = {
    icon: '\u2605',
    cssClass: 'rating',
    tooltip: 'rating: ',
    ratings: ['none', 'poor', 'below average', 'average', 'above average', 'excellent'],
    defaultStyle: ['color:#FFD9D9;text-decoration:none;background:none;'],
    colorOn: 'orange',
    colorOff: '#CCC',

    update: function (obj, action) {//actions --> 0:refresh 1:highlight 2:save
        var last, name, p, r, tid;
        p = obj.parentNode;
        r = obj.getAttribute('rel');
        name = obj.getAttribute('tiddler');
        tid = store.getTiddler(name);
        if (!tid) return;
        if (action == 2) {
            tid.fields['rating'] = r;
            store.setDirty(true);
            tids = obj.getAttribute('update').readBracketedList();
            for (i = 0; i < tids.length; i++) {
                story.refreshTiddler(tids[i], null, true);
                refreshDisplay(tids[i]);
            }
            story.refreshTiddler(name, null, true);
        }
        last = parseInt(tid.fields['rating'] || 0);
        for (i = 1; i < this.ratings.length; i++) {
            p.childNodes[i].style.color = ((action > 0 && i <= r) || (action == 0 && i <= last)) ? this.colorOn : this.colorOff;
        }
    },
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var i, out, t;
        t = params.shift();
        if (t === undefined || t == '=here') t = story.findContainingTiddler(place).getAttribute('tiddler');
        out = '<span title="rating" class="' + this.cssClass + '">';
        for (i = 0; i < this.ratings.length; i++) {
            out += '<a href="#" onmouseover="config.macros.rating.update(this,1)" ' +
                'onclick="config.macros.rating.update(this,2)" ' +
                'onmouseout="config.macros.rating.update(this,0)" ' +
                'title="' + this.tooltip + this.ratings[i] + '" rel="' + i +
                '" update="[[' + params.join(']] [[') + ']]" tiddler="' + t +
                '" style="' + this.defaultStyle + '">' + this.icon + '</a>';
        }
        place.innerHTML += out + '</span>';
        this.update(place.lastChild.firstChild, 0);
    }
}
//}}}