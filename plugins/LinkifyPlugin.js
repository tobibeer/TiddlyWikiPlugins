/***
|''Macro''|LinkifyPlugin|
|''Description''|Automatically linkifies strings, optionally using aliases<br>The plugin is based on Clint Checketts and Paul Petterson's [[RedirectMacro|http://checkettsweb.com/styles/themes.htm#RedirectMacro]]|
|Documentation|http://linkify.tiddlyspot.com|
|''Author''|Tobias Beer|
|''Version''|0.9.6 beta|
|''CoreVersion''|2.5.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/LinkifyPlugin.js|
|''Usage''|define redirects in LinkifyConfig|
!Code
***/
//{{{
(function ($) {
    config.shadowTiddlers.LinkifyConfig = "!Exclude\n-excludeLists systemConfig noLinkify\n!Linkify\nLinkifyPlugin|^linkif\n^Tiddler";

    //the handler for a linkification formatter
    linkifyHandler = function (w) {
        //find surrounding tid
        var unLink,
        tid = story.findContainingTiddler(w.output), pos;
        tid = tid ? tid.getAttribute('tiddler') : '';

        //get the actual tiddler -> not sections or slices
        pos = tid.indexOf('##');
        if (pos < 0) pos = tid.indexOf('::');
        if (pos > 0) tid = tid.substr(0, pos);

        unLink = w.source.substr(w.matchStart, 1) == config.textPrimitives.unWikiLink;

        //tid excluded?
        if (unLink || tid && window.linkifyExcluded.contains(tid)) {
            //wikify as is
            w.outputText(w.output, w.matchStart + (unLink ? 1 : 0), w.nextMatch);
            //otherwise render linkified
        } else {
            w.outputText(
                createTiddlyLink(
                    createTiddlyElement(w.output, 'span', null, 'linkified'),
                    this.target,
                    false
                ),
                w.matchStart,
                w.nextMatch
            );
        }
    }

    linkifyAddFormatter = function (term, tiddler, dontInsert, target, remove) {
        /*	term				<string>	the term to be matched, including modifiers
                tiddler			<string>	the target tiddler
                dontInsert	<bool>		when true does not insert the formatter
                target			<bool>		whether the term represents the target tiddler
                remove			<string>	any old tiddler name to be removed				   		*/

        var asIs, exists, f = 0, fmt, fmtName, fmtRemove, match, pre, prepend, reg, suff,
            cf = config.formatters,
            mod = term.substr(0, 1);

        //check for suffix modifiers
        if (term.substr(term.length - 1, 1) == '*') {
            suff = true;
            term = term.substr(0, term.length - 1);
        };

        modifiers:
        //check for prefix modifiers
            while (!asIs && ['\"', '~', '^', '*', '('].contains(mod)) {
                //check modifier
                switch (mod) {
                    case '~':
                        if (target) return false;
                    case '^':
                        prepend = true;
                        break;
                    case '\"':
                        asIs = term.substr(term.length - 1, 1) == '\"';
                        if (asIs) term = term.substr(0, term.length - 1);
                        else break modifiers;
                        break;
                    case '(':
                        reg = term.substr(term.length - 1, 1) == ')';
                        if (reg) {
                            term = term.substr(0, term.length - 1);
                        } else {
                            break modifiers;
                        }
                        break;
                    case '*': pre = true;
                }
                //remove from term and get next
                term = term.substr(1, term.length - 1);
                mod = term.substr(0, 1);
            }

        //reaplce all escape chars
        if (!reg) term = term.replace(/\\/mg, '');

        //formatter name (turn non-word to charCode)
        fmtName = "linkify_" + term.replace(
            /([\W])/mg,
            function ($1) { return $1.charCodeAt(0) }
        )

        //formatter for tiddler to be removed
        if (remove) {
            fmtRemove = "linkify_" + remove.replace(
                /([\W])/mg,
                function ($1) { return $1.charCodeAt(0) }
            )
        }

        //loop all formatters
        while (f < cf.length) {
            //formatter for new term exists?
            exists = exists || cf[f].name == fmtName;
            //remove when old one found
            if (remove && cf[f].name == fmtRemove) {
                cf.splice(f, 1);
            }
            else f++;
        };

        //skip existing, excluded or blank term
        if (exists || dontInsert || !term) return false;

        //set up the the regex to be matched -> insert the term
        match = config.textPrimitives.unWikiLink + '?' +
            (reg ? "(?:%2)" : '(?:\\b%0%2%1\\b)').format([
                pre ? '[\\w]*' : '',
                suff ? '[\\w]*' : '',
                reg ? term :
                term.escapeRegExp().replace(
                    /([a-z]|[A-Z])/img,
                    function ($1) {
                        return ("[" +
                            (asIs ? $1 :
                            ((/[\W]/mg).exec($1) ? "'" + $1 : $1.toUpperCase() + $1.toLowerCase()
                            )) + "]");
                    }
                ).replace(/[\s]/mg, '[\\s]')
            ]);

        //define formatter
        fmt = {
            'name': fmtName,
            'match': match,
            'target': tiddler,
            'handler': linkifyHandler
        }

        //pre- or append formatter
        if (prepend) cf.unshift(fmt); else cf.push(fmt);

        //it's added now
        return true;
    }

    linkifyIndexConfig = function () {
        var d, d0, m, makelast, r, rd, rx, td, t, tid, tids, tmp,
            cf = config.formatters,

        //helper to remove all known prefixes from a term
        sanitize = function (el) {
            //remove suffixes and prefixes -> then return
            el = el.replace(/^(\'|\*|\^|\~|\()+/mg, '');
            return el.replace(/(\*|\))+?/mg, '')
        };

        //done with vars -> initialize the global array for all linkified tiddlers
        window.linkifyLinkified = [];

        //get config -> user defined or default shadow tiddler
        rx = store.getTiddlerText('LinkifyConfig') || store.getShadowTiddlerText('LinkifyConfig');

        //split into lines
        rx = rx ? rx.split('\n') : [];

        //clean formatters of any linkifiers
        for (var f = 0; f < cf.length; f++) {
            if (cf[f].name.indexOf('linkify_') == 0) {
                cf.splice(f, 1);
                f--;
            }
        }

        //loop all config lines
        for (r = 0; r < rx.length; r++) {

            //skip comments
            if (!rx[r] || [' ', '!'].contains(rx[r][0])) continue;
            //split line by pipe
            rd = rx[r].split('|');
            //get tid 
            tid = sanitize(rd[0]);
            //init tid pos as first
            d0 = 0;

            //globally remember all linkified tiddlers
            window.linkifyLinkified.pushUnique(tid);

            //shift tid if required
            for (d = 1; d < rd.length; d++) {
                //get term
                td = sanitize(rd[d]);
                //if term included in tid
                if (td.toLowerCase().indexOf(tid.toLowerCase()) == 0) {
                    //swap term and tid
                    tmp = rd[d];
                    rd[d] = rd[d0];
                    rd[d0] = tmp;
                    //remember new tid pos
                    d0 = d;
                }
            }

            //add formatters for each term in this line
            for (d = 0; d < rd.length; d++) linkifyAddFormatter(rd[d], tid, false, d == d0);
        }
        //all tiddlers to be linkified?
        if (window.linkifyAllTiddlers) {
            //get all tids
            tids = store.getTiddlers();
            //loop 'em
            for (t = 0; t < tids.length; t++) {
                //get tid
                tid = tids[t].title;
                //add formatter if not excluded or not existing yet
                linkifyAddFormatter(tid, tid, window.linkifyExcluded.contains(tid) || window.linkifyLinkified.contains(tid));
            }
        }
    };
    //init formatters
    linkifyIndexConfig();

    //index all excludes
    linkifyIndexExcludes = function () {
        var e, ex = '', r, rx,
            rx = store.getTiddlerText('LinkifyConfig') || store.getShadowTiddlerText('LinkifyConfig');

        //reset global array
        window.linkifyExcluded = [];
        //split all lines
        rx = rx ? rx.split('\n') : [];
        //loop 'em
        for (r = 0; r < rx.length; r++)
            //add excludes
            if (rx[r].indexOf('-') == 0) ex += rx[r].substr(1, rx[r].length - 1) + ' ';

        //turn into array
        ex = ex.readBracketedList();
        //add tids
        ex.map(function (e) { window.linkifyExcluded.pushUnique(e) });
        //add tagging tids
        for (e = 0; e < ex.length; e++)
            store.getTaggedTiddlers(ex[e]).map(function (t) { window.linkifyExcluded.pushUnique(t.title) });
    };
    //init excludes
    linkifyIndexExcludes();

    linkifyTiddlers = function (yes) {
        window.linkifyAllTiddlers = yes;
        if (yes) {
            linkifyIndexConfig();
            linkifyIndexExcludes();
            formatter = new Formatter(config.formatters);
        }
    }

    //hijack saveTiddler
    store.saveTiddler_Linkify = store.saveTiddler;
    store.saveTiddler = function (title, newTitle) {
        //invoke core
        var r = store.saveTiddler_Linkify.apply(this, arguments),
            tid = newTitle;

        //add formatter if not excluded or not existing yet
        linkifyAddFormatter(
            tid,
            tid,
            window.linkifyExcluded.contains(tid) || window.linkifyLinkified.contains(tid),
            true,
            tid != title ? title : null
        );
        //if LinkifyConfig
        if (title == 'LinkifyConfig' || newTitle == 'LinkifyConfig') {
            //reindex
            linkifyIndexConfig();
        }
        //reindex excludes
        linkifyIndexExcludes();
        //update formatters
        formatter = new Formatter(config.formatters);
        //refresh tiddlers to update changes
        story.refreshAllTiddlers(true);
        //return
        return r;
    };

    //hijack removeTiddler
    store.removeTiddler_Linkify = store.removeTiddler;
    store.removeTiddler = function (title) {
        //invoke core
        var r = store.removeTiddler_Linkify.apply(this, arguments);
        //remove old formatter
        linkifyAddFormatter('*', null, null, null, title);
        //update formatters
        formatter = new Formatter(config.formatters);
        //refresh tiddlers to update changes
        story.refreshAllTiddlers(true);
        //return
        return r;
    }

    //shadow tiddler for styles
    config.shadowTiddlers.StyleSheetLinkify = '/*{{{*/\n' +
        '.linkified .tiddlyLink{color:[[ColorPalette::PrimaryMid]];font-weight:normal;}\n' +
        '.linkified .tiddlyLink:hover{color:[[ColorPalette::PrimaryLight]];background:transparent;}\n' +
        '.headerShadow .linkified .tiddlyLink {color:transparent !important;}\n' +
        '.siteSubtitle .linkified .tiddlyLink{color:[[ColorPalette::PrimaryPale]];background:transparent;}\n' +
        '.siteSubtitle .linkified .tiddlyLink:hover{color:[[ColorPalette::Background]];background:transparent;}\n' +
        'dt .linkified .tiddlyLink{font-weight:bold;}\n' +
        '/*}}}*/';
    store.addNotification("StyleSheetLinkify", refreshStyles);

})(jQuery)
//}}}