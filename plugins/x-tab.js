/***
<<xtab defaults:true>>
|''Name''|x-tab|
|''Description''|a crosstable for tags|
|''Documentation''|http://tbGTD.tiddlyspot.com/#%5B%5Bx-tab%20info%5D%5D|
|''Version''|1.0|
|''Type''|macro|
|''Author''|[[TobiasBeer]]|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/x-tab.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
setStylesheet('.xtabBtn{cursor:pointer}' +
'.xtab{margin:5px 0 20px 0;background:#F6F6F6;padding:10px;border:5px solid #EEE;-moz-border-radius:5px;-webkit-border-radius:5px;}' +
'.xtabFrm td{vertical-align:bottom;height:30px;margin-right:10px !important;}' +
'.xtabFrm em{margin-left:10px;font-style:normal;color:#39C;font-weight:bold;font-size:90%;}' +
'.xtabFrm input{margin-left:10px;}.xtabFrm input,.xtabFrm span{cursor:pointer;}.xtabFrm .externalLink{margin-left:10px;}' +
'.xtabFrm select{padding-right:0 !important;width:210px;cursor:pointer;float:right;}' +
'.xtabFrm xtabToggle{display:inline-block;width:65px;text-align:center;cursor:pointer;margin-right:10px;}' +
'.xtabPrv{color:#888;margin:5px 0 10px 50px;display:block;}.xtabPrv span{color:#39C;}' +
'.xtabOut {max-width:100%;overflow-y:hidden;}' +
'.viewer .xtabOut .button{margin:0;}', 'StyleSheetGTDxLookup');
//}}}
//{{{
config.macros.xtab = {
    cfg: {
        //defaults: 0=taglist, 1=presetlist, 2=autodetect-config, 3=preset
        defaults: ['x-tab config##Tags', 'x-tab config##Presets', 'x-tab config##Detect', 'xtab'],
        dropClass: 'button',
        resultTabClass: '',
        miniTag: '<<tiddler scripts##miniTag with: [[%0]]>>',
        addNew: true,
        headerRightFrom: 10,
        //preset identifiers
        pRows: 'rows',
        pCols: 'cols',
        pSec: 'snd',
        pOps: 'options',
        pOpAL: 'ALLTAGS!',
        pOpSR: '1row',
        pOpSC: '1col',
        pOpTR: 'transpose',
        //language
        info: 'info',
        btnShow: "x-tab",
        btnHide: "hide x-tab",
        btnTip: "toggle x-tab panel",
        template: "preset template... ",
        noTags: "No valid tags provided for x-tab. ",
        nOkTags: "Invalid taglist for x-tab! '%0' could not be found.",
        nOkPresets: "Invalid presets for x-tab! '%0' could not be found.",
        nOkPreset: "Invalid x-tab preset! No option '%0' in dropdown '%1'. Check your custom fields or parameters.",
        nOkRender: "Could not render x-tab into %0. No such dom-element!",
        nOkDetect: "Invalid x-tab parameter '%0' for 'detect'!",
        nOkField: "x-tab can't find field '%0' for tiddler '%1'.",
        nDef: "undefined",
        P: ["preset:", "select a preset", "select preset..."],
        R: ["rows:", "select a category tag for rows", "select rows tag..."],
        C: ["columns:", "select a category tag for columns", "select columns tag..."],
        S: ["secondary:", "select secondary for rows (first select a tag-category for rows)", "select secondary..."],
        TR: ["transpose", "click to swap rows and columns"],
        SR: ["1row", "use the tag in 'rows' or 'secondary' directly instead of its subtags"],
        SC: ["1col", "use the tag in 'columns' directly instead of its subtags"],
        AL: ["all tags", "use all available tags for dropdowns"],
        PT: ["template", "provides a template which you can use to add to your list of preset definitions"]
    },
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        this.cfg.drop = document.all ? "▼" : "▾";
        var el, id, ps = paramString, b = params[0];
        id = new Date().getTime() + ('' + Math.random()).substr(5);
        if (b && b.toUpperCase().indexOf('BUTTON') == 0) {//button must be first!
            el = createTiddlyButton(place, this.cfg.btnShow + this.cfg.drop, this.cfg.btnTip, this.toggle, 'button xtabBtn');
            jQuery(el).attr({ 'tiddler': b.substr(7), 'params': ps, 'xtabid': id });//set tiddler for button@tiddler
        } else this.create(id, ps, place);
    },
    toggle: function (e) {
        var c, f, h = false; //h=hide, f=form, x=macro
        x = config.macros.xtab, c = x.cfg;
        f = document.getElementById('xtab' + this.getAttribute('xtabid') || '');
        if (f) {//form exists -> toggle
            h = f.style.display != 'none';
            f.style.display = h ? 'none' : 'block';
        } else x.create(this);
        this.innerHTML = (h ? c.btnShow : c.btnHide) + c.drop;
        return false;
    },
    update: function (id) {
        var a1, a2, al, by, c, chk, cols, d1, d2, el, f, hc, hd, hd2 = '', hr, nu, o, out = '', pr, rows, sc, sr, snd, t, ti, t1, t2, tr, v, v1, v2, x = config.macros.xtab, c = x.cfg;
        by = function (i) { return document.getElementById(i); }
        f = by('xtabFrm' + id); el = by('xtabOut' + id); pr = by('xtabPrv' + id);
        removeChildren(el); removeChildren(pr);
        sr = by('SR' + id).checked;
        sc = by('SC' + id).checked;
        tr = by('TR' + id).checked;
        al = by('AL' + id).checked;
        snd = by('snd' + id);
        cols = by('cols' + id);
        rows = by('rows' + id);
        d1 = snd.selectedIndex > 0 ? snd : by('rows' + id);
        d2 = by('cols' + id);
        if (tr) { v = d1; d1 = d2; d2 = v; }
        v1 = d1.selectedIndex == 0 ? null : d1.value;
        v2 = d2.selectedIndex == 0 ? null : d2.value;
        if (v1 && v2) {
            a1 = sc && tr ? [store.getTiddler(v1)] : (sr && !tr ? [store.getTiddler(v1)] : store.getTaggedTiddlers(v1));
            a2 = sc && !tr ? [store.getTiddler(v2)] : (sr && tr ? [store.getTiddler(v2)] : store.getTaggedTiddlers(v2));
            hc = '\u25bc' + v1; if (sc && tr || sr && !tr) hc = '';
            hr = v2 + '\u25b6'; if (sr && tr || sc && !tr) hr = '';
            hd = '"""' + (hc && hr ? hc + '/ ' + hr : (hc ? hc : hr)) + '"""';
            if (a2.length >= c.headerRightFrom) { hr = hr ? '\u25C0' + v2 : ''; hd2 = '"""' + (hc && hr ? hr + '/ ' + hc : (hc ? hc : hr)) + '"""'; }
            out = '|' + c.resultTabClass + '|k\n| ' + hd;
            for (t2 = 0; t2 < a2.length; t2++) {
                ti = a2[t2].title;
                nu = c.addNew ? tbGTD.nu(ti) : '';
                out += ' | ' + nu + '<<tag [[' + ti + ']]>>';
            } out += (hd2 != '' ? '|' + hd2 : '') + ' |h\n';
            for (t1 = 0; t1 < a1.length; t1++) {
                ti = a1[t1].title;
                nu = c.addNew ? tbGTD.nu(ti) : '';
                hd = '<<tag [[' + ti + ']]>>';
                out += '| !' + nu + hd;
                for (t2 = 0; t2 < a2.length; t2++) {
                    out += '|'
                    tgt = store.getTaggedTiddlers(a1[t1].title);
                    for (t = 0; t < tgt.length; t++) {
                        if (tgt[t].tags.contains(a2[t2].title)) {
                            ti = tgt[t].title; out += '@@margin:0;<<tag [[' + ti + ']]>>' + c.miniTag.format([ti]) + '@@<br />';
                        }
                    }
                }
                out += (hd2 != '' ? '|' + hd + ' ' : '') + '|\n';
            }
            //preset template
            if (by('PT' + id).checked) {
                chk = function (s) { return s.indexOf(' ') >= 0 ? "'" + s + "'" : s; };
                o = sr || sc || tr;
                o = o ? c.pOps + ':' +
                (sr ? c.pOpSR : '') +
                (sc ? (sr ? '&' : '') + c.pOpSC : '') +
                (tr ? (sr || sc ? '&' : '') + c.pOpTR : '') : '';
                v = snd.value; v = snd.selectedIndex == 0 ? '' : v; v1 = rows.value; v2 = cols.value;
                wikify(c.template + '@@font-weight:bold;' + (al ? c.pOpAL : '') + chk(v) + ' ' + chk(v1) + ' by ' + chk(v2) + '==' +
                    c.pRows + ':' + chk(v1) + ' ' + (v ? c.pSec + ':' + chk(v) + ' ' : '') + c.pCols + ':' + chk(v2) + ' ' + chk(o) + '@@', pr);
            }
        }
        //create output
        wikify(out, el);
    },
    create: function (id, ps, el, setAll) {
        var a, all, at, c = this.cfg, cr, cs, d, dc, dt, f, fs, gd, i, p, pls, pos, pr, prs, rt, sp, src, t, ti, tid, tids = [], td, tds, tgs = [], tmp, tls, xel = false;
        if (typeof (id) == 'object') {
            rt = id;
            tmp = id.getAttribute('tiddler');
            if (tmp == '') el = story.findContainingTiddler(id);//into this tid
            else {
                xel = tmp.toUpperCase().indexOf('ID==') == 0;
                el = xel ? document.getElementById(tmp.substr(4)) : story.getTiddler(el);//into id or named tiddler 
            }
            if (!el) alert(c.nOkRender.format([tmp]));
            else {
                tid = el.getAttribute('tiddler');
                if (!xel) el = jQuery('.viewer', el)[0];//if tid, render in viewer
                //get attribs
                ps = id.getAttribute('params');
                id = id.getAttribute('xtabid');
            }
        }
        if (!tid) { tid = story.findContainingTiddler(el); if (tid) tid = tid.getAttribute('tiddler'); }
        p = ps.parseParams(null, null, true);//get params
        def = getParam(p, 'defaults', '').toUpperCase() == 'TRUE';
        tls = getParam(p, 'taglist'); if (!tls && def && c.defaults[0]) tls = c.defaults[0];
        pls = getParam(p, 'presets'); if (!pls && def && c.defaults[1]) pls = c.defaults[1];
        dt = getParam(p, 'detect', ''); if (!dt && def && c.defaults[2]) dt = c.defaults[2];
        pr = getParam(p, 'preset', ''); if (!pr && def && c.defaults[3]) pr = c.defaults[3];
        pos = getParam(p, 'position', '').toUpperCase();
        all = pr.toUpperCase().indexOf(c.pOpAL) == 0;
        if (all) pr = pr.substr(c.pOpAL.length);
        a = setAll || !tls || all && setAll == undefined;
        if (a) {//get tags
            tgs = store.getTags();
        } else {
            //init taglist
            if (tls) {
                tgs = store.getTiddlerText(tls);
                if (!tgs) alert(c.nOkTags.format([tls]));
                else tgs = tgs.readBracketedList();
            }
            if (tgs.length == 0 && !a) alert(c.noTags);
        }
        //init presets
        if (pls) {
            prs = store.getTiddlerText(pls);
            if (!prs) alert(c.nOkTags.format([pls]));
            else prs = prs.split('\n');
        }
        dc = c.dropClass;
        cr = createTiddlyElement;

        if (setAll == undefined) {
            sp = document.createElement('span');//render container
            if (pos == 'FIRST') el.insertBefore(sp, el.firstChild);
            else if (!xel && rt && pos != 'LAST') el.insertBefore(sp, rt.nextSibling);
            else el.appendChild(sp);
        } else sp = el;
        el = cr(sp, 'div', 'xtab' + id, 'xtab');//div
        f = cr(el, 'form', 'xtabFrm' + id, 'xtabFrm');//form
        f.setAttribute('params', ps);
        wikify('|borderless|k\n|||>|\n||||\n', f);
        tds = f.lastChild.getElementsByTagName('td');

        td = tds[1]; this.nuSel(tds[0], 'presets', prs, c.P, 'P', dc);
        cs = [['PT', 'tmpl'], ['TR', 'trans'], ['SR', 'oner'], ['SC', 'onec'], ['AL', 'allt', a]];
        for (i = 0; i < cs.length; i++) this.nuChk(td, cs[i][0] + id, cs[i][1], c[cs[i][0]], dc, cs[i][2]);
        createExternalLink(td, store.getTiddlerSlice("x-tab", "Documentation"), c.info);
        this.nuSel(tds[2], 'rows', tgs, c.R, a ? 'A' : 'R', dc, id);
        this.nuSel(tds[3], 'snd', [], c.S, 'S', dc, id);
        this.nuSel(tds[4], 'cols', tgs, c.C, a ? 'A' : 'C', dc, id);
        cr(el, 'div', 'xtabPrv' + id, 'xtabPrv');
        cr(el, 'div', 'xtabOut' + id, 'xtabOut');

        if (pr.indexOf(':') <= 0) {//preset from field(@tid)
            at = pr.indexOf('@');
            if (at > 0) {
                ti = pr.substr(at + 1);
                tid = store.getTiddler(ti);
                pr = pr.substr(0, at);
                if (!tid) alert(c.nOkField.format([pr, ti]));
                else tid = tid.title;
            }
            pr = store.getValue(tid, pr);
        }
        if (tid && dt && !pr) pr = this.detect(dt, tid);//Autodetect
        this.setPreset(id, pr, setAll);
        return id;
    },
    nuChk: function (el, cid, n, t, cl, c) {
        var bt, cb;
        cb = createTiddlyElement(el, 'input', cid, null, null, { 'type': 'checkbox', 'name': n, 'value': t[0] });
        cb.checked = c ? c : false;
        cb.onclick = this.check;
        bt = createTiddlyElement(el, 'span', null, cl + ' xtabToggle', t[0], { 'title': t[1], 'toggle': cid });
        bt.onclick = this.check;
        return (cb);
    },
    check: function (e) {
        var c, el, f, id, ns, p, x = config.macros.xtab, ps;
        c = document.getElementById(this.getAttribute('toggle'));
        if (c) c.checked = !c.checked;
        el = c ? c : this;
        id = el.getAttribute('id').substr(2);
        if (el.name == 'allt') {
            c = el.checked; f = el.form;
            el = f.parentNode; p = el.parentNode;
            ps = f.getAttribute('params');
            removeChildren(el); p.removeChild(el);
            x.create(id, ps, p, c);
        } else x.update(id);
    },
    nuSel: function (el, n, o, t, typ, c, id) {
        createTiddlyElement(el, 'em', null, null, t[0]);
        var s = createTiddlyElement(el, 'select', n + id, c, null, { 'name': n, 'title': t[1] });
        s.onchange = this.chgSel;
        this.setOpt(s, o, null, typ, t[2]);
    },
    setOpt: function (el, o, val, typ, title) {
        if (val && el.getAttribute('cat') == val) return;
        var i, l, os;
        l = o ? o.length : 0;
        os = el.options;
        el.disabled = l == 0;
        while (os.length > 1) os[os.length - 1] = null;
        os[0] = new Option(title, null, false, false);
        if (l) {
            for (i = 0; i < l; i++) {
                var t = o[i];
                switch (typ) {
                    case 'P': t = t.split('=='); n = t[0]; v = t[1]; break;
                    case 'A': n = v = t[0]; break;
                    case 'S': t = t.title;
                    default: n = t; v = t;
                }
                os[os.length] = new Option(n, v, false, false);
            }
        }
    },
    chgSel: function (e) {
        var x = config.macros.xtab, id = this.form.getAttribute('id').substr(7);
        switch (this.name) {
            case 'presets': if (this.selectedIndex > 0) x.setPreset(id, this.value); break;
            case 'rows': x.initSecondary(id);
            default: x.update(id);
        }
    },
    initSecondary: function (id) {
        var s, r, tgt, v;
        r = document.getElementById('rows' + id);
        v = r.value;
        s = document.getElementById('snd' + id);
        tgt = r.selectedIndex > 0 ? store.getTaggedTiddlers(v) : [];
        this.setOpt(s, tgt, v, 'S', this.cfg.S[2]);
        s.setAttribute('cat', v ? v : '');
    },
    setPreset: function (id, pr, setAll) {
        var chk, f, l, ls, o, p, x, c = this.cfg, u = c.nDef;
        if (pr) {
            f = document.getElementById('xtabFrm' + id);
            p = pr.parseParams(null, null, false);
            ls = [
                ['rows', getParam(p, c.pRows, u), c.pRows],
                ['cols', getParam(p, c.pCols, u), c.pCols],
                ['snd', getParam(p, c.pSec), c.pSec]
            ];
            document.getElementById('snd' + id).selectedIndex = 0;
            for (l = 0; l < ls.length; l++) { if (ls[l][1] && !this.chkSel(id, ls[l], f)) return false; }
            o = getParam(p, c.pOps, '');
            x = function (n, s) { document.getElementById(n + id).checked = o.indexOf(s) >= 0 };
            x('TR', c.pOpTR); x('SR', c.pOpSR); x('SC', c.pOpSC); if (setAll == undefined) x('AL', c.pOpAT);
        }
        this.update(id);
    },
    detect: function (t, tid) {
        var a, d, l, n, ot, tgs, c = this.cfg;
        d = store.getTiddlerText(t);
        f = [c.pRows + ':[[%0]] ' + c.pCols + ':[[%1]]',
            c.pRows + ':[[%0]] ' + c.pCols + ':[[%1]] ' + c.pSec + ':[[%2]] ' + c.pOps + ':' + c.pOpTR + '&' + c.pOpSR,
            c.pRows + ':[[%0]] ' + c.pCols + ':[[%1]] ' + c.pSec + ':[[%2]] ' + c.pOps + ':' + c.pOpTR];
        if (!d) alert(c.nOkDetect.format([t]));
        else {
            a = d.split('\n');
            while (a.length > 0) {
                l = a.shift().readBracketedList(); n = l.length;
                if (tid == l[0]) {
                    switch (n) {
                        case 3: return f[2].format([l[0], l[1], l[2]]);
                        case 2:
                        case 4: return f[0].format([l[0], l[1]]);
                    }
                } else {
                    ot = store.getTiddler(tid);
                    if (ot.tags.contains(l[0])) {
                        switch (n) {
                            case 3: return f[2].format([l[0], l[1], tid]);
                            case 2:
                            case 4: return f[1].format([l[0], l[1], tid]);
                        }
                    }
                }
            }
        }
    },
    chkSel: function (id, a, f) {
        var c = '', o, s, t, v;
        s = document.getElementById(a[0] + id); v = a[1];
        if (s) {
            o = s.options;
            for (t = 1; t < o.length; t++) { c = o[t].value; if (v == c) { s.selectedIndex = t; break; } }
        }
        if (v != c) { alert(this.cfg.nOkPreset.format([v, a[2]])); return false; }
        if (a[0] == 'rows') this.initSecondary(id);//reset secondary
        return true;
    }
}
//}}}