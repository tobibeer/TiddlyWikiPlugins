/***
|''Name:''|x-plore|
|''Description''|Explore tiddler relations|
|''Version:''|0.2|
|''Type''|macro|
|''Author:''|[[TobiasBeer]]|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/x-plore.min.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''Note''|idea and parts of the code have their roots in [[RelatedTiddlersPlugin|http://tiddlytools.com/#RelatedTiddlersPlugin]]|
!important
<<tiddler 'under development'>>
!configuration
Use the following sections in [[x-plore]] to define elements...
*not to be explored via ''exclude''
*to be cut of via ''truncate''
!exclude
star
!truncate
excludeLists
systemConfig
TAG==site
!help
/%
<<tiddler {{t='x-plore info';store.getTiddler(t)?t:'x-plore::helplink'}}>>
helplink:For more information see or import [[x-tab info]] from [[tbGTDServer]]...
%/
!source code
***/
//{{{
config.macros.xplore = {
    skipped: ' ...',
    lblBtn: 'x-plore' + (document.all ? "▼" : "▾"),
    topBtn: 'Explore tiddler relations',
    lblTagging: '!!tagged by',
    lblTags: '!!tagging to',
    lblRefs: '!!referenced by',
    lblLinks: '!!linking to',
    styles:
        '#popup #xplore div {text-decoration:none;padding:7px;min-width:136px;_width:180px;}' +
        '#popup #xplore div a {padding:2px;white-space:nowrap;font-weight:normal;display:block;}' +
        '#popup #xplore blockquote {padding-left:3px;margin:0;}' +
        '#popup #xplore blockquote blockquote {border-left:1px solid #333;margin:0 0 0 10px;}' +
        '#popup #xplore blockquote a {_width:90%;}' +
        '#popup #xplore h2 {border:0;margin-top:0.5em;}' +
        '#popup #xplore td {border:1px solid transparent !important;padding: 0 5px 5px 5px !important;}' +
        '#popup #xplore td:hover{border:1px solid #333 !important;}' +
        '#popup #xplore div br {display:none;}',
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var p, btn, cls, ex, fst, min, mode, tb, tid, tit, tree, trunc, r;
        tid = story.findContainingTiddler(place);
        tit = tid ? tid.getAttribute('tiddler') : '';
        p = paramString.parseParams(null, null, true);
        btn = getParam(p, 'button', '').toString() == 'true';
        tb = getParam(p, 'toolbar', '').toString() == 'true';
        if (btn && tit) {
            btn = createTiddlyButton(place, this.lblBtn, this.tipBtn, this.click, "button", "xploreBtn");
            btn.setAttribute('tiddler', tit);
            btn.setAttribute('params', paramString);
            if (tb) btn.setAttribute('toolbar', true);
            return;
        }
        fst = getParam(p, 'first', tit);
        cls = getParam(p, 'class', '');
        tree = getParam(p, 'tree', 'true') == 'true';
        var getArr = function (prm) {//retrieve array from tiddler text
            var a = getParam(p, prm, '').readBracketedList(), f = a[0], i, j, t, x, s = [];
            if (f && f.substr(0, 5).toUpperCase() == 'GET==') {
                t = store.getTiddlerText(f.substr(5));
                if (s) {
                    a = t.readBracketedList();
                    for (i = 0; i < a.length; i++) {
                        f = a[i];
                        if (f && f.substr(0, 5).toUpperCase() == 'TAG==') {
                            a.splice(i, 1);
                            x = store.getTaggedTiddlers(f.substr(5));
                            for (j = 0; j < x.length; j++) s.pushUnique(x[j].title);
                        }
                    }
                    for (i = 0; i < s.length; i++) a.pushUnique(s[i]);
                    a.sort();
                }
            }
            return a;
        }
        ex = getArr('exclude');
        trunc = getArr('truncate');
        r = getParam(p, 'root', '') == 'true';
        min = getParam(p, 'minimal', '') == 'true';
        mode = getParam(p, 'mode', '');
        if (mode != '') {
            if (this['get' + mode] == undefined) mode = 'Tagging';
            wikify(this['lbl' + mode] + '\n' + this.list(fst, tree, trunc, ex, this['get' + mode], r, min), place);
        } else {
            wikify('|' + cls + '|k\n|||||', place);
            var tds = place.lastChild.getElementsByTagName('td');
            wikify(this.lblTagging + '\n' + this.list(fst, tree, trunc, ex, this.getTagging, r, min), tds[0]);
            wikify(this.lblTags + '\n' + this.list(fst, tree, trunc, ex, this.getTags, r, min), tds[1]);
            wikify(this.lblRefs + '\n' + this.list(fst, tree, trunc, ex, this.getRefs, r, min), tds[2]);
            wikify(this.lblLinks + '\n' + this.list(fst, tree, trunc, ex, this.getLinks, r, min), tds[3]);
        }
    },
    list: function (first, asTree, trunc, ex, get, r, min) {
        //first: tree root tid, asTree: tree <> list, trunc: [[tids]] [[limiting]] the tree
        //ex: exclude tagged tids, r: display root, min: true=min spanning tree <> false=multiple pathes for 'nodes'
        //get: fct getXYZ(tiddlerObj){return arrayOfTiddlerTitles;}
        //    ...possibly one of getLinks, getRefs, getTags, getTagging (see below)
        var out, tids = [], tree = { text: '' }, indent = '', paths = min ? undefined : [];//init sublists []
        tids = this.search(first, tids, tree, indent, trunc, ex, get, r, paths);//start recursion
        setStylesheet(this.styles, 'xploreStyles');
        out = '{{xploreList{\n';
        if (asTree) out += tree.text;//when tree return tree
        else if (tids.length > 0) out += '[[' + tids.join(']][[') + ']]';//when list, join as links
        return out + '}}}';
    },
    search: function (tid, tids, tree, indent, trunc, ex, get, r, paths, p, fst) {
        //trunc, ex, get, r, paths: dito
        //tid: start tid, tids: searched tids[], tree: output tree 
        //indent: curr indent lvl, paths: all found paths[],p: current path in paths
        var t = store.getTiddler(tid);//root tid of branch
        var ini = false;
        var b = (paths != undefined); //multiple paths
        if (b && p == undefined) {//if so and sublist not paths
            p = 0; paths[p] = []; ini = true; //init pointer, sublist and store init
        }
        if (fst == undefined) fst = tid;//check & store fst
        //return curr list, if missing, excluded via tag or already in (sub-)list
        if (!t || tid == fst && tids.length > 0 || t.tags.containsAny(ex) || b && paths[p].contains(t) || !b && tids.contains(tid)) return tids;
        //if not init of multiple paths or rootnode to be displayed... add to sublist
        if (!ini || r) {
            if (b) paths[p].push(t);
            tids.push(t.title); //add tiddler to results
            var skip = trunc && trunc.contains(tid); //skip when in truncated
            tree.text += indent + "[[" + tid + (skip ? this.skipped.format([tid]) : "") + "|" + tid + "]]" + "\n";
            if (skip) return tids; // branch is pruned... don't follow links
        }
        var links = get ? get(t) : this.getTagging(t);//get next level via get fct or links
        //init subpaths by copying the current one
        if (b) for (var i = 1; i < links.length; i++) paths[p + i] = paths[p].slice(0);
        for (var i = 0; i < links.length; i++)//search subnodes
            tids = this.search(links[i], tids, tree, indent + ">", trunc, ex, get, r, paths, (p ? p + i : p), fst);
        return tids;//return list
    },
    getLinks: function (t) { if (!t.linksUpdated) t.changed(); return t.links; },
    getRefs: function (t) {
        var i, o = [], r = store.getReferringTiddlers(t.title);
        for (i = 0; i < r.length; i++) if (r[i].title != t.title) o.push(r[i].title);
        return o;
    },
    getTags: function (t) { return t.tags; },
    getTagging: function (t) {
        var o = [], l = store.getTaggedTiddlers(t.title);
        for (var i = 0; i < l.length; i++) if (l[i].title != t) o.push(l[i].title);
        return o;
    },
    click: function (e) {
        e = e || window.event;
        var p = Popup.create(this);
        wikify('<<xplore button:false first:\'' + this.getAttribute('tiddler') + '\' ' + this.getAttribute("params") + '>>', createTiddlyElement(p, 'span', 'xplore', 'xplore'));
        Popup.show(p, false);
        s = document.getElementById('sidebar');
        if (this.getAttribute('toolbar')) { p.style.left = ''; p.style.right = (20 + (s ? s.offsetWidth : 0)) + 'px'; }
        e.cancelBubble = true; if (e.stopPropagation) e.stopPropagation();
        return false;
    }
}
//}}}