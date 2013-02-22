/***
|Name|TiddlerTabsPlugin|
|Version|0.9.1 beta|
|Documentation|http://tiddlertabs.tiddlyspace.com|
|Author|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|~CoreVersion|2.6.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/TiddlerTabsPlugin.js|
|License|Creative Commons 3.0|
!Info
This plugin lists all tiddlers in tabs via the {{{<<tiddlerTabs>>}}} macro.
!Parameters
group = number of starting letters per group
sub = max number of columns in a tab
!Example
An Example...
{{{<<tiddlerTabs group:1 sub:1>>}}}
<<tiddlerTabs group:1 sub:1>>
!Code
***/
//{{{
(function ($) {

    config.macros.tiddlerTabs = {
        fmtSubTitle: '\n{{ttTitle{%0}}}',
        fmtListItem: '\n[[%0]]',
        defaultGroup: 3,
        defaultSub: 3,
        defaultRanges: 'az 09 _ *',
        caseInsensitive: true,
        onlyRanges: true,
        specialChars: /[\W\_]+/,
        minSubLength: 5,
        subTitles: true,
        subTitleMaxLength: 3,
        txtTabTitle: 'list tiddlers in "%0"',

        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var a, a0, a1, an, at = [], aOut = [], aSub, c, cx, first, g = 0, head, l, last, len, lt = {}, lOut = [], n = 0, newRange, next, r, r0, r1, rItems = {},
                s, secs = '', sh, sp = 0, split, sub0, sub1, special, subStart, subTids, subTitle, style = '', t, tabs = '', ti, tx,

                //named params
                p = paramString.parseParams(null, null, true),
                name = getParam(p, 'name', $('#tiddlerDisplay').html().length % 100000),
                group = parseInt(getParam(p, 'group', 0)),
                sub = parseInt(getParam(p, 'sub', 0)),
                noCase = getParam(p, 'caseInsensitive', null),
                ranges = getParam(p, 'ranges', this.defaultRanges).split(' '),
                only = getParam(p, 'onlyRanges', this.onlyRanges),
                tids = store.getTiddlers('title');

            noCase = noCase == null ? this.caseInsensitive : noCase.toString().toLowerCase() == 'true';
            only = only == null ? this.onlyRanges : only.toString().toLowerCase() == 'true';

            //sort tids when case insensitive
            if (noCase) tids.sort(function (x, y) {
                var a = String(x.title).toUpperCase();
                var b = String(y.title).toUpperCase();
                if (a > b) return 1
                if (a < b) return -1
                return 0;
            });

            group = isNaN(group) || group < 1 ? this.defaultGroup : group;
            sub = isNaN(sub) || sub < 1 ? this.defaultSub : sub;

            function addChar(l, ti) {
                at.pushUnique(l);
                if (!lt[l]) lt[l] = ti && isNaN(ti) ? [ti] : [];
                else lt[l].push(ti);
                if (!isNaN(ti)) {
                    rItems[l] = ti;
                }
            }

            function setCase(c) {
                return !c ? null : (noCase ? c.toUpperCase() : c);
            }

            function nextChar(i) {
                var l;
                i--;
                do {
                    i++;
                    l = at[i];
                } while (lt[l] && lt[l].length < 1);
                return { i: i, l: l };
            }

            if (ranges[0]) {
                for (r = 0; r < ranges.length; r++) {
                    r0 = ranges[r].substr(0, 1);
                    if (r0 == '*') addChar('*', r);
                    else if (r0 == '^') noCase = true;
                    else if (ranges[r].length == 1) addChar(r0, r);
                    else {
                        r0 = setCase(r0);
                        r1 = setCase(ranges[r].substr(ranges[r].length - 1, 1));
                        c = r0.charCodeAt(0) - 1;
                        cx = r1.charCodeAt(0);
                        do {
                            c++;
                            addChar(String.fromCharCode(c), r);
                        } while (c < cx);
                    }
                }
            }

            for (t = 0; t < tids.length; t++) {
                ti = tids[t].title;
                c = ti.substr(0, 1);
                if (!at.contains(setCase(c))) c = this.specialChars.exec(c) ? '*' : setCase(c);
                if (ranges[0] && only && !at.contains(c)) continue;
                addChar(c, ti);
            }

            a = next = nextChar(0);

            while (next.l && a.i < at.length) {
                a = $.extend({}, next);
                next = nextChar(a.i + 1);
                if (g == 0) {
                    a0 = a.i;
                    lOut[n] = '';
                    aOut[n] = [];
                }
                newRange = rItems[a.l] != rItems[next.l];
                if (group < 3 || g == 0 || newRange || (group > 2 && g == group - 1) || a.i == at.length - 1) lOut[n] += a.l;
                else if (group > 2 && g == 1) {
                    if (a.i < at.length - group + 1) {
                        lOut[n] += '-';
                    } else {
                        a1 = at[a0];
                        an = at[a.i];
                        lOut[n] += (a1 == an ? '...' : (a1.charCodeAt(0) < an.charCodeAt(0) + 2 ? '' : '-') + an);
                    }
                }

                aOut[n] = aOut[n].concat(lt[a.l]);
                g++;
                if (g == group || newRange) {
                    g = 0;
                    newRange = false;
                    if (!aOut[n][0]) {
                        aOut.pop();
                        lOut.pop();
                    } else {
                        n++;
                    }
                }
            }
            sh = 'TiddlerTabs_' + name;

            for (n = 0; n < aOut.length; n++) {
                aSub = sub + 1;
                do {
                    aSub--;
                    split = Math.floor(aOut[n].length / aSub) + 1;
                } while (split < Math.max(this.minSubLength, aSub) && aSub > 1);

                tab = lOut[n];
                tabs += '\n' + tab + ' \'' + this.txtTabTitle.format([tab]) + '\' [[' + sh + '##' + tab + ']]';
                tids = sub0 = sub1 = subTids = '';
                len = 0;
                for (t = 0; t < aOut[n].length; t++) {
                    if (sp == 0) subStart = t;
                    subTids += this.fmtListItem.format([aOut[n][t]]);
                    sp++;
                    if (sp == split || t == aOut[n].length - 1) {
                        subTitle = '';
                        sp = l = 0;
                        if (this.subTitles) {
                            while (sub0 == sub1) {
                                l++;
                                if (len > 0 && l < len) l = len;
                                sub0 = setCase(aOut[n][subStart].substr(0, l));
                                sub1 = setCase(aOut[n][t].substr(0, l));
                                if (subStart == t || l == this.subTitleMaxLength) { sub1 = ''; break; }
                            }
                            len = l;
                            head = sub0.substr(0, this.subTitleMaxLength);
                            first = (sub1 ? sub0 : (head == last ? '&nbsp;' : head + ' ... '));
                            tx = setCase(aOut[n][t].substr(0, l));
                            subTitle = first == '&nbsp;' ? '... ' + tx : first + (sub1 ? ' ... ' + sub1 : '');
                            subTitle = (aSub < 2 ? '' : this.fmtSubTitle.format([subTitle]));
                        }
                        tids += '{{ttSub ttSub' + aSub + '{ {{ttInner{' + subTitle + subTids + ' }}} }}}';

                        last = head;
                        sub0 = sub1 = subTids = '';
                    }
                }
                secs += '\n!' + tab + '\n' + tids + '{{ttClear{ }}}';
            }

            config.shadowTiddlers[sh] = '{{ttTabs{<<tabs txt' + sh + tabs + '\n>>}}}/%' + secs + '\n!END%/';

            wikify('<<tiddler [[' + sh + ']]>>', place);
        }
    }

    var s, style = '';
    for (s = 1; s < 10; s++) style += '\n.ttSub' + s.toString() + '{\n\twidth:' + (Math.floor(100 / s)).toString() + '%;\n}';
    config.shadowTiddlers['StyleSheetTiddlerTabs'] =
    '/*{{{*/' +
    '\n.ttTabs .tab{\n\tpadding:3px 5px 2px 5px;margin: 0 0 0 1px;\n\tborder:1px solid transparent;\n\tborder-bottom:none;\n}' +
    '\n.ttTabs .tabSelected{\n\tborder-color: [[ColorPalette::TertiaryLight]];\n}' +
    '\n.ttTitle{\n\tdisplay:block;\n\tfont-size:1.2em;margin: 0 10px -10px 0;padding-left:10px;border-bottom:1px solid #aaa;\n}' +
    '\n.ttInner{\n\tmargin:0 5px;\n}' +
    '\n.ttClear{\n\tdisplay:block;\n\tclear:both;\n}' +
    '\n.ttSub{\n\tdisplay:block;\n\tfloat:left;overflow:hidden;\n}' +
    '\n' + style + '\n' +
    '/*}}}*/';
    store.addNotification('StyleSheetTiddlerTabs', refreshStyles);

})(jQuery);
//}}}