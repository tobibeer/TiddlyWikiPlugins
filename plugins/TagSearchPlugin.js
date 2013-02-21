/***
|''Name:''|TagSearchPlugin|
|''Description:''|Provides a drop down listing current tags and others to be set.|
|''Author:''|[[Tobias Beer]]|
|''Version:''|1.2.0 (2010-10-10)|
|''Documentation:''|http://tagsearch.tiddlyspot.com|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/IconTabsPlugin.js|
|''~CoreVersion:''|Version 2.5.3 or better|
***/
//{{{
(function ($) {

    config.macros.tagsearch = {
        cfg: {
            defaultSource: '',
            defaultMore: '',
            defaultMode: 1,
            keepModified: false,
            sidebarOffset: 20,
            newAtSingle: 30,
            newAt: 18,
            excludeTagged: '',
            toolbar: '',

            label: "tags",
            options: "Options",
            more: "More...",
            tooltip: "Manage tiddler tags",
            notags: "no tags set...",
            aretags: "Current tags",
            addTag: "Add tag...",
            addTags: "Set tag...",
            txtEdit: "~ edit categories...",
            txtEditTip: "edit tiddler with GTD tag categories used by x-tagger",
            txtNew: "~ add another tag",
            txtRemove: "remove tag %0",
            txtAdd: "set tag %0",
            txtFor: "To be tagged... ",
            txtCtrl: " (hold SHIFT to just add it or CTRL to replace in category)",
            promptNew: "Enter new tag:",
            modeAsk: "Do you want to remove existing tags from category '%0'?\nCancel simply adds tag '%1'.",
        },

        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var c = this.cfg,
                tid = story.findContainingTiddler(place),
                p = paramString.parseParams('tagman', null, true);
            $(createTiddlyButton(
                place,
                getParam(p, 'label', c.label),
                getParam(p, 'tooltip', c.tooltip),
                this.click,
                'button'
            )).attr({
                id: this.newId('btntgs'),
                tid: (tid ? tid.getAttribute('tiddler') : '')
            }).data({
                pa: params,
                p: p
            })
        },

        click: function (ev) {
            var ar, curr, d1, d2, ex = [], fst = true, i, j, l, npop, nbtns, nli, m, pop, s, t, tgs = [], tids, ti, tgt,
            e = ev || window.event,
            el = $(this),
            id = el.attr('popup'),
            trigger = window.event ? 'keydown' : 'keypress',
            x = config.macros.tagsearch,
            c = x.cfg,
            pa = el.data('pa'),
            p = el.data('p'),
            tb = pa.contains('toolbar'),
            src = getParam(p, 'source', c.defaultSource),
            mr = getParam(p, 'more', c.defaultMore),
            search = !pa.contains('nosearch'),
            tags = !pa.contains('notags'),
            more = !pa.contains('nomore'),
            gt = getParam(p, 'goto', ''),
            mode = parseInt(getParam(p, 'mode')),
            rtid = getParam(p, 'tiddler', ''),
            tid = rtid ? rtid : el.attr('tid'),
            exp = (getParam(p, 'exclude', '') + ' ' + c.excludeTagged).readBracketedList(),
            max = nu = src ? c.newAt : c.newAtSingle,
            otid = store.getTiddler(tid);
            if (!tid) return;

            mode = isNaN(mode) ? c.defaultMode : mode;
            exp.map(function (e) { ex.pushUnique(e); });
            for (i = 0; i < exp.length; i++) {
                store.getTaggedTiddlers(exp[i]).map(function (t) { ex.pushUnique(t.title) });
            }
            if (src && !store.getTiddlerText(src)) return false;

            if (id) {
                pop = $('#' + id)[0];
                $(pop).empty();
            }
            if (!pop) {
                npop = true;
                id = x.newId('tgspop');
                pop = Popup.create(this);
                $(pop).addClass('tgs'
                ).attr({
                    'id': id
                }).data({
                    btn: el,
                    tiddler: tid,
                    source: src,
                    mode: mode
                }).click(x.noBubble);
                el.attr('popup', id);
            }

            if (src) {
                tids = store.getTiddlerText(src).readBracketedList();
                for (t = 0; t < tids.length; t++) {
                    if (!ex.contains(tids[t])) {
                        tgt = store.getTaggedTiddlers(tids[t]);
                        tgs.push('TAG:' + tids[t]);
                        for (s = 0; s < tgt.length; s++) {
                            if (!ex.contains(tgt[s].title)) tgs.push(tgt[s].title);
                        }
                    }
                }
            } else tgs = store.getTags();

            curr = otid ? otid.tags.sort() : [];
            nli = function (p, cls) { return createTiddlyElement(createTiddlyElement(p, 'li', null, null), 'ol', null, cls ? cls : null); }
            nbtns = function (where, text, tag, tip) {
                var s, t;
                s = createTiddlyElement(createTiddlyElement(where, 'li'), 'span', null, null);
                t = $(createTiddlyButton(s, text, tip.format(["'" + tag + "'"]), x.setTag, 'button toggleButton', null));
                t.data({
                    tiddler: tid,
                    tag: tag,
                    source: src,
                    mode: mode
                });
                insertSpacer(s);
                createTagButton(s, tag);
            }

            d1 = nli(pop, 'tgside');
            //SEARCH
            if (config.macros.gotoTiddler && search) {
                d2 = nli(d1);
                if (rtid) {
                    l = createTiddlyElement(d2, 'li', null, 'addto', '');
                    wikify('{{title{' + c.txtFor + '}}}<<tag [[' + tid + ']]>>', l);
                    d2 = nli(d1);
                }
                createTiddlyElement(d2, 'li', null, 'title', c.addTag);
                wikify('<<gotoTiddler ' + gt + ' >>', d2);
                $('input', pop
                ).bind(trigger, x.noBubble
                ).data('notify', config.macros.tagsearch.notify
                ).focus();
            }

            //EXISTING
            d2 = nli(d1);
            createTiddlyElement(d2, 'li', null, 'title', c.aretags);
            if (curr.length == 0) wikify('{{notags{' + c.notags + '}}}', d2);
            else for (t = 0; t < curr.length; t++) nbtns(d2, '[X]', curr[t], c.txtRemove);

            //TAGS
            if (tags) {
                for (i = 0; i < tgs.length; i++) {
                    nu++;
                    ti = src ? tgs[i] : tgs[i][0];
                    if (ti.indexOf('TAG:') == 0) {
                        ti = ti.substr(4);
                        if (nu > max) { nu = 0; d1 = nli(pop); } d2 = nli(d1); nu++;
                        createTiddlyLink(createTiddlyElement(d2, 'li', null, null), ti, ti, 'title');
                    }
                    else if (!curr.contains(ti) && !ex.contains(ti)) {
                        if (!src && nu > max || src && nu > c.newAtSingle) {
                            nu = 0; d1 = nli(pop); d2 = nli(d1);
                            if (fst) { createTiddlyElement(createTiddlyElement(d2, 'li', null, null), 'li', null, 'title', c.addTags); fst = false; }
                        }
                        nbtns(d2, '[' + String.fromCharCode(160, 160, 160) + ']', ti, c.txtAdd + (src ? c.txtCtrl : ''));
                    }
                }
            }

            //MORE / OPTIONS
            if (more) {
                d1 = nli(pop, 'tgside');
                d2 = nli(d1); createTiddlyElement(d2, 'li', null, 'title', c.options, null);
                createTiddlyButton(
                    createTiddlyElement(d2, 'li'),
                    c.txtNew,
                    null,
                    x.setTag,
                    'tsopt',
                    null,
                    null,
                    { 'tiddler': tid }
                );
                if (src) {
                    createTiddlyButton(
                        createTiddlyElement(d2, 'li'),
                        c.txtEdit,
                        c.txtEditTip,
                        onClickTiddlerLink,
                        'tsopt',
                        null,
                        null,
                        { 'tiddlyLink': src.split('##')[0] }
                    )
                }
                //MORE
                fst = true;
                if (mr) {
                    m = store.getTiddlerText(mr).readBracketedList();
                    if (m.length > 0) {
                        for (i = 0; i < m.length; i++) {
                            ti = m[i];
                            if (ti.indexOf('TAG:') == 0) {
                                ti = ti.substr(4, ti.length - 4);
                                d2 = nli(d1); createTiddlyLink(createTiddlyElement(d2, 'li', null, null), ti, ti, 'title');
                                ar = store.getTaggedTiddlers(ti);
                                for (j = 0; j < ar.length; j++) {
                                    ti = ar[j].title;
                                    if (!curr.contains(ti) && !ex.contains(ti))
                                        nbtns(d2, '[' + String.fromCharCode(160, 160) + ']', ti, c.txtAdd);
                                }
                            } else {
                                if (fst) { d2 = nli(d1); createTiddlyElement(d2, 'li', null, 'title', c.more); fst = false; }
                                if (!curr.contains(ti) && !ex.contains(ti))
                                    nbtns(d2, '[' + String.fromCharCode(160, 160) + ']', ti, c.txtAdd);
                            }
                        }
                    }
                }
            }
            if (npop) {
                Popup.show(pop, false);
                if (tb) {
                    s = document.getElementById('sidebar');
                    pop.style.left = ''; pop.style.right = (c.sidebarOffset + (s ? s.offsetWidth : 0)) + 'px';
                }
            }
            return x.noBubble(e);
        },

        setTag: function (ev) {
            var ca, cats, nu, ok = true, t, tgs, tgt, ti,
            e = ev || window.event,
            x = config.macros.tagsearch,
            c = x.cfg,
            el = $(this),
            p = el.closest('.tgs'),
            btn = p.data('btn'),
            tag = el.data('tag'),
            title = p.data('tiddler'),
            src = p.data('source'),
            m = parseInt(p.data('mode'));
            if (!tag) { nu = prompt(c.promptNew, ''); if (!nu) return false; else tag = nu; }
            tid = x.exists(title, tag);
            if (tid) {
                tgs = tid.tags;
                if (!tgs.contains(tag)) {
                    if (src && m < 2 && !e.shiftKey) {
                        cats = store.getTiddlerText(src).readBracketedList();
                        findTagged: for (ca = 0; ca < cats.length; ca++) {
                            ti = cats[ca];
                            tgt = store.getTaggedTiddlers(ti).map(function (t) { return t.title });
                            if (tgt.contains(tag)) {
                                tgt.splice(tgt.indexOf(tag), 1);
                                if (!e.ctrlKey && m == 1 && tgs.containsAny(tgt))
                                    ok = confirm(c.modeAsk.format([ti, tag]));
                                if (ok) {
                                    for (t = 0; t < tgt.length; t++) {
                                        ti = tgt[t];
                                        if (tgs.contains(ti)) store.setTiddlerTag(title, false, ti);
                                    }
                                }
                                break findTagged;
                            }
                        }
                    }
                    store.setTiddlerTag(title, true, tag);
                } else if (!nu) store.setTiddlerTag(title, false, tag);
                t = store.getTiddler(title);
                store.saveTiddler(
                    title,
                    title,
                    t.text,
                    c.keepModified ? t.modifier : config.options.txtUserName,
                    c.keepModified ? t.modified : new Date(),
                    t.tags,
                    t.fields
                );
            }
            if (config.options.chkAutoSave) autoSaveChanges();
            btn.click();
            p.find('input').focus();
            return x.noBubble(e);
        },

        newId: function (p) {
            return p + Math.random().toString().substr(3);
        },

        notify: function (tag, el) {
            var p = $(el).closest('.tgs'),
                i = $('form input', p)[0];
            t = config.macros.tagsearch.exists(p.data('tiddler'), tag);
            if (t && !t.tags.contains(tag)) store.setTiddlerTag(t.title, t, tag);
            p.data('btn').click();
            i.select();
        },

        exists: function (title, tag) {
            if (!store.getTiddler(title)) { //||!tid.tags
                var f = merge({}, config.defaultCustomFields);
                store.saveTiddler(title, title, '', config.options.txtUserName, new Date(), tag, f);
                return false;
            }
            return store.getTiddler(title);
        },

        noBubble: function (ev) {
            var e = ev || window.event, el = resolveTarget(e);
            if (e.keyCode == 27) Popup.remove(0);
            else if (e.type != 'click' && el.nodeName.toUpperCase() == 'INPUT') return true;
            if (hasClass(el, 'tiddlyLink')) return true;
            Popup.remove(1);
            e.cancelBubble = true;
            try { event.keyCode = 0; } catch (e) { };
            if (window.event) e.returnValue = false;
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            return false;
        }
    }

    //HIJACK TOOLBAR
    config.commands.tagSearch = {}
    var cmt = config.macros.toolbar;
    cmt.createCommandTAGS = cmt.createCommand;
    cmt.createCommand = function (place, commandName, tiddler, className) {
        if (commandName == 'tagSearch') {
            wikify('<<tagsearch toolbar ' + config.macros.tagsearch.cfg.toolbar + '>>', place);
            $(place.lastChild).attr({
                commandName: 'tagSearch',
                tiddler: tiddler.title
            });
        } else cmt.createCommandTAGS.apply(this, arguments);
    }

    //GOTOPLUGIN
    var gt = config.macros.gotoTiddler;
    if (gt) {
        gt.processItem = function (title, here, list, showlist) {
            if (!title.length) return;
            list.style.display = showlist ? 'block' : 'none';
            if (title == '*') { story.search(here.value); return false; } // do full-text search
            if (!showlist) here.value = title;
            var n = $(here).data('notify');
            if (n) n.call(this, title, here); //notify of selection, otherwise...
            else story.displayTiddler(null, title); // show selected tiddler (default behaviour)
            return false;
        }
        gt.IEtableFixup = '%0';
    }

    var TM = store.getTiddlerText('ColorPalette::TertiaryMid'),
        TD = store.getTiddlerText('ColorPalette::TertiaryDark');
    config.shadowTiddlers['StyleSheetTagSearch'] = '/*{{{*/\n' +
        '.tgs {padding:7px !important;-moz-border-radius:5px; -webkit-border-radius:5px;border-radius:5px;}\n' +
        '.tgs li a, .tgs .quickopentag .tiddlyLink {display:inline;padding:2px;clear:none;}\n' +
        '.tgs li a.toggleButton {display:inline;margin-left:5px;}\n' +
        '.tgs .title {margin:3px 0 0 5px;font-weight:bold;font-size:150%;color:' + TM + ';padding:0;}\n' +
        '.tgs form{display:block;float:left;clear:both;padding-left:5px !important;}\n' +
        '.tgs .addto .quickopentag{display:block;clear:both;padding:5px;font-size:120%;}\n' +
        '.tgs .notags, .tsopt{display:block;clear:both;margin:5px;}\n' +
        '.tgs .highlight{background:' + TD + ';}\n' +
        '.tgs ol{margin:0;padding:0 0 5px 0;}\n' +
        '.tgs li{display:block;float:left;padding-bottom:10px !important;}\n' +
        '.tgs li span{line-height:1em;}\n' +
        '.tgs li ol li{clear:both;min-width:120px;display:inline;border:1px solid transparent;}\n' +
        '.tgs li ol li:hover{border:1px solid ' + TM + ';}\n' +
        '.tgs li ol li ol li{padding:0 !important;}\n' +
        '.tgs li ol li ol li:hover{border:1px solid transparent;}\n' +
        '.tgside li ol li {min-width:150px;}' +
        '.tgs .quickopentag {display:inline;}\n' +
        '.tgs .quickopentag .tiddlyLink:hover {text-decoration:underline;}\n' +
        '.tgs .quickopentag .button {border:0;padding:2px;font-size:1.5em;}\n' +
        '/*}}}*/';
    store.addNotification('StyleSheetTagSearch', refreshStyles);

})(jQuery);
//}}}