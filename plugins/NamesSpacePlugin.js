/***
|''Name''|NameSpacePlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Documentation''|http://namespace.tiddlyspace.com|
|''Version''|0.0.1 alpha|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/NamesSpacePlugin.js|
|''~CoreVersion''|2.6.5|
***/
//{{{
(function ($) {

    //the macro for use in the ViewTemplate
    config.macros.ns = {
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var aNS = [], bNS = true, iNS, last = '', n = 0, ns, qNS = '', r, rest,
                title = $(place).prev(),
                pre = $('<span />').prependTo($(place).parent())[0],
                oTid = $(story.findContainingTiddler(place)),
                tid = oTid ? oTid.attr('tiddler') : null;
            if (tid) {
                // (array): stores the namespace components of the current tiddlers title
                aNS = tid.split(':');
                // (int): control variable to loop namespace components
                iNS = aNS.length > 1;
                if (iNS) {
                    //boolean: breaks the loop when no further namespace components exist as tiddlers
                    while (bNS) {
                        //the currenty inspected namespace component
                        ns = aNS[n];
                        //no more namespace components as tiddlers?
                        if (!store.getTiddler(ns)) {

                            bNS = false;
                            //(array): holds not yet inspected namespace components
                            rest = aNS.splice(n, aNS.length - n);
                            //(int): control var for looping over the rest array
                            for (r = 0 ; r < rest.length ; r++)
                                last = last + rest[r] + (r == rest.length - 1 ? '' : ':');
                            title.html(last);
                        }
                        n++;
                    }
                    n = 0;
                    while (n < aNS.length) {
                        wikify('[[' + aNS[n] + ']]<<ns_popup cat:[[' + aNS[n] + ']] tid:[[' + tid + ']]>>', pre);
                        n++;
                    }
                }
                qNS = store.getValue(tid, 'ns_cat');
                if (qNS) {
                    wikify('[[' + qNS + ']]<<ns_popup cat:[[' + qNS + ']] tid:[[' + tid + ']] byval:true>>', pre);
                    wikify('<<ns_popup cat:[[' + title.html() + ']] tid:[[' + tid + ']] last:true>>', title[0]);
                }
            }
        }
    }

    //the popup for the namespace delimiter which shows options and items related to a namespace component
    config.macros.ns_popup = {
        //configuration options / localization
        txtSeparator: ':',
        txtLast: '...',
        txtTooltip: 'Other tiddlers under namespace %0...',
        //executed when the popup opens
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var cfg = {}, cat, el, tid,
                p = paramString.parseParams(null, null, true),
                cat = getParam(p, 'cat', null);

            el = $(createTiddlyButton(
                place,
                getParam(p, 'label', getParam(p, 'last', false) == 'true' ? this.txtLast : this.txtSeparator),
                getParam(p, 'tooltip', this.txtTooltip.format([cat])),
                this.click,
                'ns_popup_btn'
            )).attr({
                'id': this.newId('ns_btn_')
            }).data('cfg', {
                byval: getParam(p, 'byval', false),
                cat: cat,
                tid: getParam(p, 'tid', null)
            });
        },

        //the click handler of the namespace delimiter
        click: function (ev) {
            var i, items = [], ns_cat, t, ti,
                e = ev || window.event,
                c = $(this).data('cfg'),
                tid = c['tid'],
                cat = c['cat'],
                byval = c['byval'],
                tids = store.getTiddlers('title'),
                pop = Popup.create(this);

            $(pop).addClass('popup ns_popup');

            for (t = 0; t < tids.length; t++) {
                ti = tids[t].title;
                if (ti == tid) continue;
                if (byval) {
                    ns_cat = store.getValue(ti, 'ns_cat');
                    if (ns_cat == cat) items.push(ti);
                } else {
                    ti = ti.split(':');
                    if (tids[t].title != ti[0] && ti.contains(cat)) items.push(tids[t].title);
                }
            }

            if (!items[0])
                createTiddlyElement(pop, "li", null, null, 'No items found...');
            else {
                for (i = 0; i < items.length; i++)
                    createTiddlyLink(createTiddlyElement(pop, "li"), items[i], true);
            }

            Popup.show();
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
            return false;
        },

        //generates a unique random Id
        newId: function (p) {
            return p + Math.random().toString().substr(3);
        }
    }

})(jQuery);
//}}}