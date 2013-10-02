/***
|''Macro''|LinkifyPlugin|
|''Description''|Automatically turns text into links, optionally using aliases<br>The plugin idea is based on Clint Checketts and Paul Petterson's [[RedirectMacro|http://checkettsweb.com/styles/themes.htm#RedirectMacro]]|
|''Documentation''|http://linkify.tiddlyspot.com|
|''Author''|Tobias Beer|
|''Version''|1.1.1 (2013-10-02)|
|''CoreVersion''|2.5.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/LinkifyPlugin.js|
|''Usage''|define redirects in LinkifyConfig|
!Code
***/
//{{{
(function ($) {
    //default LinkifyConfig
    config.shadowTiddlers.LinkifyConfig = "!Exclude\n-excludeLists systemConfig noLinkify\n!Linkify\nLinkifyPlugin|^linkif\n^Tiddler";

    //create extension and store reference to it in local variable
    var cel = config.extensions.linkify = {

        //settings
        defaults: {
            //whether or not to autolink all tiddler titles
            linkifyAllTiddlers: true,
            //elements in which matches are NOT to be linkified
            doNotLinkifyInside: 'h1,h2,h3,h4,h5,h6,.header,.noLinkify',
            //whether or not links to the current tiddler should be linkified
            doNotLinkifySameTiddler : true
        },

        //do not write to these => they are programatically assessed!
        linkified: [],
        excluded: [],

        //the formatter handler
        handler: function (w) {
            var pos, unLink,
                //ignore when link is inside an ignored element
                ignore = $(w.output).closest(cel.defaults.doNotLinkifyInside).length > 0,
                //get surrounding tiddler dom element
                tid = story.findContainingTiddler(w.output);

            //get tiddler name
            tid = tid ? tid.getAttribute('tiddler') : '';

            //also ignore links in the current tiddler when they should not be linkified
            ignore = ignore || cel.defaults.doNotLinkifySameTiddler && tid == this.target;

            //get the actual tiddler -> not sections or slices
            pos = tid.indexOf('##');
            if (pos < 0) pos = tid.indexOf('::');
            if (pos > 0) tid = tid.substr(0, pos);

            //whether to ignore this match (prefixed with tilde ~)
            unLink = w.source.substr(w.matchStart, 1) == config.textPrimitives.unWikiLink;

            //ignore container or escaped or tid excluded?
            if (ignore || unLink || tid && cel.excluded.contains(tid)) {
                //wikify as is
                w.outputText(w.output, w.matchStart + (unLink ? 1 : 0), w.nextMatch);

            //otherwise render linkified
            } else {
                //output match
                w.outputText(
                    //into a new tiddlyLink
                    createTiddlyLink(
                        //wrappedin a space of class .linkified
                        createTiddlyElement(w.output, 'span', null, 'linkified'),
                        this.target,
                        false
                    ),
                    w.matchStart,
                    w.nextMatch
                );
            }
        },

        /* adds a new formatter to the array */
        addFormatter: function (term, tiddler, dontInsert, target, remove) {
            /*	term		<ttring>	the term to be matched, including modifiers
                tiddler		<string>	the target tiddler
                dontInsert  <bool>		when true does not insert the formatter
                target		<bool>		whether the term represents the target tiddler
                remove		<string>	any old tiddler name to be removed				   		*/

            var asIs, exists, f = 0, fmt, fmtName, fmtRemove, match, pre, prepend, reg, suff,
                //reference to formatters
                cf = config.formatters,
                //get modifier
                mod = term.substr(0, 1);

            //check for suffix modifiers
            if (term.substr(term.length - 1, 1) == '*') {
                //has suffix
                suff = true;
                //remove suffix
                term = term.substr(0, term.length - 1);
            };

            modifiers:
            //for as long as there are modifiers to check and string not taken literally
            while (!asIs && ['\"', '~', '^', '*', '('].contains(mod)) {
                //depending on the modifier
                switch (mod) {
                    //prevents the target tiddler from being linkified
                    case '~':
                        if (target) return false;
                    //prepend new formatter to formatter array?
                    case '^':
                        //remember
                        prepend = true;
                        break;
                    //use upper and lower case as is
                    case '\"':
                        //also ends with double quotes?
                        asIs = term.substr(term.length - 1, 1) == '\"';
                        //then remove last double quote
                        if (asIs) term = term.substr(0, term.length - 1);
                        //otherwise leave outer loop
                        else break modifiers;
                        break;
                    //use regex
                    case '(':
                        //only when also ending in a parethesis
                        reg = term.substr(term.length - 1, 1) == ')';
                        //then remove last
                        if (reg) term = term.substr(0, term.length - 1);
                        //otherwise leave outer loop
                        else break modifiers;
                        break;
                    case '*': pre = true;
                }
                //remove modifier from term
                term = term.substr(1);
                //check next letter
                mod = term.substr(0, 1);
            }

            //replace all escape chars
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
                'handler': cel.handler
            }

            //pre- or append formatter
            if (prepend) cf.unshift(fmt); else cf.push(fmt);

            //it's added now
            return true;
        },

        /* indexes the LinkifyConfig tiddler */
        indexConfig: function () {
            var d, d0, m, makelast, r, rd, rx, td, t, tid, tids, tmp,
                cf = config.formatters,

            //helper to remove all known prefixes from a term
            sanitize = function (el) {
                //remove suffixes and prefixes -> then return
                el = el.replace(/^(\'|\*|\^|\~|\()+/mg, '');
                return el.replace(/(\*|\))+?/mg, '')
            };

            //done with vars -> initialize the global array for all linkified tiddlers
            cel.linkified = [];

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
                cel.linkified.pushUnique(tid);

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

                //for each term in this line
                for (d = 0; d < rd.length; d++)
                    //add formatter
                    cel.addFormatter(rd[d], tid, false, d == d0);
            }

            //all tiddlers to be linkified?
            if (cel.defaults.linkifyAllTiddlers) {
                //get all tids
                tids = store.getTiddlers();
                //loop 'em
                for (t = 0; t < tids.length; t++) {
                    //get tid
                    tid = tids[t].title;
                    //add formatter if not excluded or not existing yet
                    cel.addFormatter(tid, tid, cel.excluded.contains(tid) || cel.linkified.contains(tid));
                }
            }
        },

        /* index all excludes */
        indexExcludes: function () {
            var e, ex = '', r, rx,
                //read config
                rx = store.getTiddlerText('LinkifyConfig') || store.getShadowTiddlerText('LinkifyConfig');

            //reset global array
            cel.excluded = [];
            //split all lines
            rx = rx ? rx.split('\n') : [];
            //loop 'em
            for (r = 0; r < rx.length; r++)
                //add excludes
                if (rx[r].indexOf('-') == 0) ex += rx[r].substr(1, rx[r].length - 1) + ' ';

            //turn into array
            ex = ex.readBracketedList();
            //add tids
            ex.map(function (e) { cel.excluded.pushUnique(e) });
            //add tagging tids
            for (e = 0; e < ex.length; e++)
                store.getTaggedTiddlers(ex[e]).map(function (t) { cel.excluded.pushUnique(t.title) });
        },

        /* init the plugin */
        init: function () {
            //init formatters
            this.indexConfig();
            //init excludes
            this.indexExcludes();
            //update formatters
            formatter = new Formatter(config.formatters);
        }
    }

    //run init
    config.extensions.linkify.init();

    //DEPRECATED, use linkifyAllTiddlers
    window.linkifyTiddlers = function() {
    }

    /* hijack saveTiddler */
    TiddlyWiki.prototype.saveTiddlerLINKIFY = TiddlyWiki.prototype.saveTiddler;
    TiddlyWiki.prototype.saveTiddler = function(title,newTitle,newBody,modifier,modified,tags,fields,clearChangeCount,created,creator) {
        //hijacked by LinkifyPlugin
        var tids = [],
            //invoke core
            r = store.saveTiddlerLINKIFY.apply(this, arguments),
            tid = newTitle;

        //add formatter if not excluded or not existing yet
        cel.addFormatter(
            tid,
            tid,
            cel.excluded.contains(tid) || cel.linkified.contains(tid),
            true,
            tid != title ? title : null
        );
        //if LinkifyConfig
        if (title == 'LinkifyConfig' || newTitle == 'LinkifyConfig') {
            //reindex
            cel.indexConfig();
        }
        //reindex excludes
        cel.indexExcludes();
        //update formatters
        formatter = new Formatter(config.formatters);

        //renamed?
        if(tid != title){
            //loop all refresh elements
            $('[tiddler]',$('[content]')).each(function(){
                //get telement
                var $t = $(this),
                    //contents
                    txt = $t.text() || '',
                    //tiddler
                    tid= $t.attr(tiddler)|'';

                //contains old or new?
                if(txt.indexOf(newTitle) >- 1 || txt.indexOf(title) > -1){
                    if(tid)tids.pushUnique(tid);
                }
            });

            //loop all tag buttons or tiddlyLinks
            $('a[tag], a[tiddlyLink]').each(function(){
                //get tid from tiddlyLink
                var t,
                    $t = $(this),
                    tid = $t.attr('tiddlyLink');

                //none? => get from tag
                tid = tid ? tid : $t.attr('tag');

                //if it's the same as the old or new
                if(tid == title || tid == newTitle){
                    //find outer tiddler for refresh
                    t = $(this).closest('.tiddler').attr('tiddler')
                    //add to tids for refreshing
                    if(t)tids.pushUnique(t);
                }
            });

            //loop all matching tids
            tids.map(function(tid){
                //refresh
                story.refreshTiddler(tid, null, true);
            });
        }
        //return
        return r;
    };

    /* hijack removeTiddler */
    store.removeTiddler_Linkify = store.removeTiddler;
    store.removeTiddler = function (title) {
        //hijacked by LinkifyPlugin
        //invoke core
        var r = store.removeTiddler_Linkify.apply(this, arguments);
        //remove old formatter
        config.extensions.linkify.addFormatter('*', null, null, null, title);
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