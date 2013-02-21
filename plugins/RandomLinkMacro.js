/***
|''Name''|RandomLinkMacro|
|''Description''|creates a random tiddlyLink (refreshes on click)|
|''Documentation''|http://tobibeer.tiddlyspace.com/#RandomLink|
|''Author''|Tobias Beer|
|''Version''|1.5.0 (2011-12-05)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/RandomLinkMacro.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion''|2.5.3|
!Usage
{{{<<randomlink label:'A random link' tags:"tagA [[tag B]]" class:linkClass close:false>>}}}
!Example
<<randomlink tags:systemConfig class:button>>
!Code
***/
//{{{
config.macros.randomlink = {

    //OPTIONS
    closeLast: true,
    cssClass: 'tiddlyLink tiddlyLinkExisting',
    display: null, //where to display the tiddler {{null, 'top', 'bottom'}}
    tipOpen: "Click to show '%0'",

    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var p = paramString.parseParams(null, null, true);
        this.get(
            getParam(p, 'label', ''),
            getParam(p, 'tags', ''),
            getParam(p, 'class', this.cssClass),
            getParam(p, 'close', this.closeLast).toString(),
            place
        )
    },

    get: function (label, tags, css, close, place) {
        var fst, i, num, out, t, ti, tid, tids = [], ts,
            ev = label || window.event;
        cmr = config.macros.randomlink;

        //GET BUTTON
        if (!place) {
            var btn = this,
            label = btn.getAttribute('label'),
            open = btn.getAttribute('tiddler'),
            tags = btn.getAttribute('tags'),
            css = btn.getAttribute('css'),
            close = btn.getAttribute('close') == 'true',
            last = btn.getAttribute('last');
        }

        //GET TIDS
        ts = tags ? tags.readBracketedList() : null;
        if (ts) {
            ts.map(function (t) {
                var tgt = store.getTaggedTiddlers(t);
                tgt.map(function (t) {
                    tids.pushUnique(t);
                });
            });
        } else tids = store.getTiddlers();

        //GET NEXT
        num = tids.length;
        if (!num) return;
        t = tids[Math.floor(Math.random() * num)];

        //OUTPUT
        ti = t.title;
        tip = cmr.tipOpen.format([ti]);

        //UPDATE LINK
        if (btn) {
            if (!label) btn.innerHTML = ti;
            btn.setAttribute('tiddler', ti);
            btn.setAttribute('title', tip);
            if (ev.ctrlKey) return false;
            else {
                btn.setAttribute('last', open);
                if (close) {
                    tid = story.findContainingTiddler(btn);
                    tid = tid ? tid.getAttribute('tiddler') : '';
                    if (last && last != tid) story.closeTiddler(last, true);
                }
                story.displayTiddler(cmr.display, open);
            }
        }

            //CREATE LINK
        else createTiddlyButton(
            place, label ? label : ti, tip, cmr.get, 'randomLink ' + css, null, null,
            {
                tiddler: ti,
                label: label,
                tags: tags,
                css: css,
                close: close
            }
        );
    }
}

//}}}