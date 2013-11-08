/***
|''Name''|GetPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|fetch and output a (list of) tiddler, section, slice or field using a predefined or custom format|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/GetPlugin.js|
|''Documentation''|http://get.tiddlyspace.com|
|''Version''|1.2.3 2013-11-07|
|''~CoreVersion''|2.6.2|
|''License''|Creative Commons 3.0|
!Code
***/
//{{{
(function ($j) {
    
    //define get macro
var me = config.macros.get = {

        config: "GetPluginConfig",

        //dictionary with terms
        dict: {
            errFunction: "Function undefined!",
            errFunctionInfo: "config.macros.get.get%0 is not a valid function!",
            errConfig: "Config not found!",
            errConfigInfo: "Config '%0' either does not exist or does not have a 'Tags' section!",
            defaultCategory: "Tiddler",
            tipSlider: "toggle '%0'",
            tipTab: "show '%0'"
        },

        identifiers: {
            filter: '$',
            fuzzy: '~',
            tiddler: '!'
        },

        //default output templates
        template: {
            fuzzy: '%0',
            tiddler: '![[%1]]\n%0',
            section: '!%3 / [[%1]]\n%0',
            slice: ';%3\n:%0',
            field: ';%3\n:%0',
            tiddlerList: '!![[%1]]\n%0',
            sectionList: '!![[%1]]\n%0',
            sliceList: ';[[%1]]\n:%0',
            fieldList: ';[[%1]]\n:%0',
            tiddlerTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            sectionTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            sliceTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            fieldTable: '|[[%1]]|%0|\n',

            /*  Important, in the following templates %0, %1, etc
                do NOT correspond to the default placeholders       */

            //TABLES HEADS
            //%0 = Category (default: 'tiddler')
            //%1 = Reference, i.e. the section, slice or field name
            tiddlerTableHead: '| !%0 | !Text |h\n',
            sectionTableHead: '| !%0 | !%1 |h\n',
            sliceTableHead: '| !%0 | !%1 |h\n',
            fieldTableHead: '| !%0 | !%1 |h\n',
            
            //SLIDERS
            //%0 = cookie name
            //%1 = (calculated) reference, i.e. tiddler, tiddler##section or tiddler::slice
            //%2 = button title (= tiddler name)
            //%3 = button tooltip (= dict.tipSlider)
            fmtSliders: '<<slider "%0" "%1" "%2" "%3">>',
            
            //TABS
            //%0 = cookie name
            //%1 = (calculated) string of tabs as pairs of "[[title]] [[tooltip]] [[content##reference]]"
            fmtTabs: '<<tabs "%0" %1>>',
            
            tableClass: 'getTable',
            dateFormat: '0DD.0MM.YYYY'
        },

        //the macro handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            //no params, nothing to get
            if (!paramString) return;
            var def, lp, mode, out = '', tg, tag, tags, tpl, txt, what,
                //get the outer tiddler
                t = story.findContainingTiddler(place),
                //get tiddler tags
                tgs = tiddler && tiddler.tags ? tiddler.tags : [],
                //parse paramsString
                p = paramString.parseParams('anon', null, true),
                //get specified config
                cfg = getParam(p, 'config', false),
                //filter to be used
                filter = getParam(p, 'filter'),
                //listfiltr
                listfiltr = params.contains('listfiltr'),
                //get first param
                p0= params[0];

            //when fuzzy
            if (me.identifiers.fuzzy == p0) {
                //remember
                var fuzzy = true;
                //remove first param
                params.shift();
            }

            //get title from context tiddler otherwise from outer tiddler
            title = tiddler ? tiddler.title : (t ? t.getAttribute('tiddler') : '');

            //when full tiddler
            if (me.identifiers.tiddler == p0) {
                //remember
                var full = true;
                //remove first param
                params.shift();
            }

            //when getting value from filter match
            if(me.identifiers.filter == p0){
                //get reference for def filters and loop each line
                $j(store.getTiddlerText(params[1]).split('\n')).each(function(){
                    //split line by pipe
                    var line = this.split('|');
                    //loop tiddlers matching filter defined for line
                    $j(store.filterTiddlers(line[0])).each(function () {
                        //matches?
                        if(title == this.title)
                            //get def value from line
                            out = line[1];
                        //abort when found
                        return !out;
                    });
                    //abort when found
                    return !out;
                });
                //no match? => done
                if (!out) return;

            //otherwise, when using config...
            } else if (cfg) {
                //get text reference for item
                refItem = getParam(p, 'refItem', me.identifiers.tiddler);
                //...and tag
                refTag = getParam(p, 'refTag', me.identifiers.tiddler);
                //take specified config tiddler or default config
                cfg = (cfg == 'true' ? me.config : cfg);
                //get tags from config
                tags = store.getTiddlerText(cfg + '##Tags');

                //tags config not found?
                if (!tags) {
                    //render error
                    createTiddlyError(place, me.dict.errConfig, me.dict.errConfigInfo.format([cfg]));
                //tags config found?
                } else {
                    //split into array
                    tags = tags.split('\n');
                    //get template
                    tpl = store.getTiddlerText(cfg + '##Template');
                    //loop config tags
                    for (t = 0; t < tags.length; t++) {

                        //get tag
                        tg = tags[t];

                        //ignore blank lines or commentish beginnings
                        if ( ['', ' ','/','{'].contains(tg.substr(0,1)) ) continue;

                        //get tag as array split by '|'
                        //'none' = both tag and tagged items
                        //'|tag' = only tag
                        //'tag|' = only tagged items
                        tg = tags[t].split('|');

                        //determine and parse line params
                        lp = $j.trim(tg[tg.length > 2 ? 2 : tg.length - 1]).parseParams('anon', null, true);

                        //if this is the tag tiddler
                        if (tiddler.title == tg[ tg.length == 1 ? 0 : 1 ] &&
                            //and tags are to be considered
                            (tg.length == 1 || tg[1] != '') &&
                            //and tag reference not globally turned off
                            refTag != 'false')
                                //get reference for tag
                                mode = 1;

                        //if tiddler is tagged with this tag
                        else if (tgs.contains(tg[0]) &&
                            //and tagged items are to be considered
                            (tg.length == 1 || tg[0] != '') &&
                            //and item reference not globally turned off
                            refItem != 'false')
                                //get reference for item
                                mode = 2;

                        //rendering mode activated?
                        if (mode) {

                            //use the tiddler macro
                            wikify('<<tiddler "' +
                                    //to render the template
                                    cfg + '##Template" with: "' +
                                    //and pass down the global or line reference for either the tag or the tagged item
                                    (mode == 1 ? getParam(lp, 'refTag', refTag) : getParam(lp, 'refItem', refItem) ) + '" "' +
                                    //and the tiddler title
                                    tiddler.title + '"' +
                                '>>', place);
                            //done
                            return;
                        }

                    }
                }
                //no match for config? => done
                return;
            }
            //all other variables
            var $ = 0, $val = '', $vals = [], fmt, tid, tx='', v, val, vals, w,
                //output container
                $el = $j(place),
                //refresh status
                refresh = $el.attr('macroName') == 'get',
                //get exec function from params or use getValues as default
                exec = me[getParam(p, 'exec', 'getValues')],
                //format
                format = getParam(p, 'format', ''),
                //output template
                template = store.getTiddlerText(getParam(p, 'template', '')),
                //fetch plain or as key => value
                plain = params.contains('plain'),
                //output as sliders?
                sliders = getParam(p,'sliders', params.contains('sliders')),
                //or tabs?
                tabs = getParam(p,'tabs',params.contains('tabs')),
                //get output template either as fuzzy or as table when specified or list when filter is used otherwise leave empty
                tpl = 
                    sliders                             ? 'Sliders' : (
                    tabs                                ? 'Tabs'    : (
                    params.contains('table')            ? 'Table'   : (
                    params.contains('list') || filter   ? 'List'    : '' ))),
                //helper
                as = tpl.toLowerCase(),
                //whether to render as sliders or tabs
                st = ['sliders','tabs'].contains(as),
                //what to fetch, either empty when entire tiddler or as first param
                what = full ? '' : params[0],
                //only when no output given yet, check for separators and split into array of [key,sep,value]
                ref = config.filters.get.delimiterRegExp.exec( out ? '' : what),
                //get separator
                sep = ref ? ref[2] : '',
                //get value
                element = ref ? ref[3] : '',
                //determine type of query
                type =
                    //as section
                    sep == '##' ? 'section' : (
                    //slice
                    sep == '::' ? 'slice' : (
                    //or field, otherwise tiddler
                    sep == '??' ? 'field' : 'tiddler')),
                //whether or not the value is prefixed
                prefixv = getParam(p, 'valueprefix', ''),
                //what to use as a prefix
                prefix = getParam(p, 'prefix', ''),
                //what to use as a suffix
                suffix = getParam(p, 'suffix', ''),
                //name of the category to get
                cat = getParam(p, 'category', me.dict.defaultCategory),
                //what header to use depending on query
                header = getParam(p, 'header',
                    //empty when not table
                    as != 'table' ? '' :
                        // otherwise the first table row with the generic css classes
                        '|' +
                        me.template.tableClass + ' ' +
                        me.template.tableClass + type.toUpperCase() +
                        '|k\n' +
                        //and the corresponding (custom) table header
                        me.template[type + 'TableHead'].format([cat, element])
                    ),
                //what footer to use
                footer = getParam(p, 'footer', ''),
                //what separator to use for rendering result items
                separator = getParam(p, 'separator', '\n'),
                //generate random cookie id for sliders or tabs
                random = st ? (new Date()).formatString('YYYY0MM0DD0hh0mm0ss') + Math.random().toString().substr(6) : '';

            //get values if output not defined
            if(!out){
                //get tiddler either fuzzy or from reference or as first param
                title = fuzzy || !what ? title : (ref ? (ref[1] ? ref[1] : title) : what);

                //when sliders or tabs
                if(st){
                    //get corresponding format
                    fmt = me.template[ 'fmt' +
                        (as == 'tabs' ? 'Tabs' : 'Sliders')
                    ];
                //otherwise
                } else {
                    //when to be gotten as plain, take value as is
                    fmt = plain ? '%0' : (
                        //when format defined use that otherwise use
                        format ? format : (
                            //when template defined use that otherwise get template
                            template ? template : me.template[
                                //for fuzzy 
                                (fuzzy ? 'fuzzy' :
                                    //for section or
                                    (sep == '##' ? 'section' + tpl :
                                        //for slice or
                                        (sep == '::' ?  'slice' + tpl :
                                            //for field or otherwise for tiddler
                                            (sep == '??' ? 'field' + tpl :
                                                'tiddler' + tpl
                                            )
                                        )
                                    )
                                )
                            ]
                        )
                    )
                }
                //if exec function exists
                if (exec) {
                    //execute to get values
                    vals = exec.call(
                      me,
                      paramString,
                      fuzzy ? what : ((as ? '' : title) + sep + element),
                      title,
                      type,
                      element,
                      as,
                      fuzzy
                    );
                //exec function defined that doesn't exist
                } else {
                    //render error
                    createTiddlyError(place, me.dict.errFunction, me.dict.errFunctionInfo.format([get]));
                    return false;
                }

                //loop all transclusion params as $1 .. $n
                do {
                    //next
                    $++;
                    //add to values
                    $vals.push($val);
                    //add $i
                    $val = getParam(p, '$' + $, null);
                //as long as that param exists
                } while ($val != null);

                //loop all return values
                for (v = 0; v < vals.length; v++) {
                    //get tiddler
                    tid = vals[v][0];
                    //get value prepending the optional prefix
                    val = prefixv + vals[v][1];
                    //fix code section
                    val = val.indexOf('***/\n') != 0 ? val : val.substr(5);

                    //loop all transclusion params
                    for ($ = 1; $ < $vals.length; $++) {
                        //replace in value
                        val = val.replace(new RegExp('\\$' + $, 'mg'), $vals[$]);
                    }

                    //what to get as full reference, e.g. "tiddlerName##SectionTitle"
                    w = (as ? tid : '') + what;

                    //replace wannabe newline characters
                    fmt = fmt.replace(/\\n/mg,'\n');
                    //render as tabs?
                    if(as == 'tabs'){
                        //add this tid to tabs
                        tx += ' [[%0]] [[%1]] [[%2]]'.format([
                            tid,
                            me.dict.tipTab.format([ w ]),
                            w
                        ]);
                    //anything other than tabs
                    } else {
                        //add to output
                        out += (
                          //item prefix
                          prefix +
                          (
                            //render sliders?
                            as == 'sliders' ?
                            (
                                //when same tiddler and full tiddlers to be fetched
                                full && title == tid ?
                                //do not render
                                '' :
                                //otherwise render slider format
                                fmt.format([
                                    'chk' + ('string' == typeof sliders ? sliders : random) + tid.replace(/(?!\w)[\x00-\xC0]/mg, '_'),
                                    w,
                                    tid,
                                    me.dict.tipSlider.format([ w ])
                                ])
                            ) :
                            //render item format
                            fmt.format([
                                val,
                                tid,
                                type,
                                element,
                                w,
                                cat
                            ])
                          ) +
                          //suffix
                          suffix
                        //replace count
                        ).replace(/\$count/mg, String.zeroPad(v + 1, vals.length.toString().length)) +
                            //add item separator for non-last
                            (as && v < vals.length - 1 ? separator : '');
                    }
                }

            }
            //when output as tabs
            if(as == 'tabs'){
                out = (
                    prefix +
                    fmt.format([
                        'txt' + ('string' == typeof tabs ? tabs : random),
                        tx
                    ]) +
                    suffix
                //optional count in  prefix or suffix
                ).replace(/\$count/mg, vals.length);
            }

            //add to output
            out =
              //optional header
              (header ? header : '') +
              //the output
              out +
              //optional footer
              (footer ? footer : '');

            //if this is not a refresh action
            if (!refresh) {
                //create outer wrapper
                $el = $j('<span />');
                //append to place
                $el.appendTo(place);
                //redefine place
                place = $el[0];
                //set wrapper attributes for refresh
                $el.attr({
                    'refresh': 'macro',
                    'macroName': 'get',
                    'params': paramString
                });
            }

            //wikify trimmed output into the wrapper
            wikify(
                (listfiltr ? '{{lf_get{\n%0\n}}}<<listfiltr>>' : '%0')
                    .format([$j.trim(out)]),
                place
            );
        },

        //refresh function for tiddler updates
        refresh: function (el, paramString) {
            //clean output
            $j(el).empty();
            //invoke again
            me.handler(
              el,
              'get',
              paramString.readMacroParams(),
              null,
              paramString
            );
        },

        // get queried values as
        // paramString = the original paramstring
        // what = what to fetch
        // tiddler = the tiddler name
        // type = the type to be gotteh, either tiddler, section, slice, or field
        // element = the element from which to get it
        // as = helper equivalent to type in lowerCase
        getValues: function (paramString, what, tiddler, type, element, as, fuzzy) {

            var d, t, tid, tids, v, vals = [],
                //parse params
                p = paramString.parseParams('getval', null, true),
                //get filter
                filter = getParam(p, 'filter', null),
                //if namespace macro defined, e.g. via NameSpacePlugin
                ns = fuzzy ? config.macros.ns : false,
                //get tids depending on defined type
                tids = as ?
                    //when type defined get from filter or all
                    (filter ? store.filterTiddlers(filter) : store.getTiddlers('title')) :
                    //when not defined, define single tiddler array
                    [{ title: tiddler }];

            //always get single value when fuzzy
            if (fuzzy) as = '';

            //only when fuzzy
            if (ns){
                //get namespace separator
                ns = ns ? ns.defaults.separator : '';

                //get title of namespace chill tiddler
                tid = tiddler + ns + what;

                //try to get text from namespace child
                ns = store.getTiddlerText(tid);

                //when exists
                if (ns) {
                    //add value
                    vals.push([tid,ns]);
                    //change tiddler
                    tiddler = store.getTiddler(tid);
                    //reset type
                    type = 'tiddler';
                    //set fuzzy to null => indicates match
                    fuzzy = null;
                }
            }

            //only when no namespace child found
            if (!ns) {

                //loop all tids
                for (t = 0; t < tids.length; t++) {
                    //reset value
                    v = undefined;

                    //get the title
                    tid = tids[t].title;
                    //when fuzzy or field query
                    if (fuzzy || type == 'field') {
                        //try to get field value
                        v = store.getValue(tid, fuzzy ? what : element);
                        //when fuzzy and field found
                        if (fuzzy && v)
                            //reset type and as
                            type = 'field';
                    }

                    //no field value found
                    if (!v) {
                        //fuzzy-get
                        if (fuzzy) {
                            //try to get slice value
                            v = store.getTiddlerText(tid + '::' + what);
                            //slice value found?
                            if (v)
                                //set type
                                type = 'slice';
                            //no slice value found?
                            if (!v) {
                                //check for section
                                v = store.getTiddlerText(tid + '##' + what);
                                //section value found?
                                if (v) 
                                    //set type
                                    type = 'section';
                            }
                            //no section found either?
                            if (!v) {
                                //get tiddler text
                                v = store.getTiddlerText(what);
                                //tiddler value found?
                                if (v) {
                                    //set type
                                    type = 'tiddler';
                                }
                            }
                        //when not fuzzy
                        } else {
                            //get from tiddler text
                            v = store.getTiddlerText((as ? tid : '') + what);
                        }
                    }

                    //check if date
                    d = v && v.length == 12 ? Date.convertFromYYYYMMDDHHMM(v) : undefined;
                    //if it is a date, format it
                    if (d && !isNaN(d.getMonth)) v = d.formatString(me.template.dateFormat);

                    //add to values
                    if (v) {
                        vals.push([tid, v]);
                    }
                }
            }

            //return values as array
            return vals;
        }
    }

    //new get filter
    config.filters.get = function (results, match) {
        var
            //whether or not this is the first filter
            first = match.index == 0,
            //what to get
            ref = config.filters.get.delimiterRegExp.exec(match[3]),
            //depending on whether there was a separator get tiddler, separator and value
            tid = ref ? ref[1] : match[3],
            sep = ref ? ref[2] : '',
            val = ref ? ref[3] : '',
            //when first filter, get all tids, otherwise take previous results
            tids = first ? store.getTiddlers('title') : results.slice();

        //reset results
        results = [];

        //loop all tiddlers
        tids.map(
          //recursively invoke this anonymous function
          function (t){
            if (
                //when tiddler matches
                tid && tid == t.title ||
                //or no tid specified and
                !tid && (
                    //when field query and lookup returns something
                    sep == '??' && store.getValue(t.title, val) ||
                    //when the generic lookup returns something
                    store.getTiddlerText(t.title + sep + val)
                )
            //add to matching tiddlers
            ) results.pushUnique(t);
        });

        //return result list
        return results;
    };

    //delimiter regexp for get filter
    config.filters.get.delimiterRegExp = /(.*)?(\#\#|::|\?\?)(.*)/;

})(jQuery);
//}}}