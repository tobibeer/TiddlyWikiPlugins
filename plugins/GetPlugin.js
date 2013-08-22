/***
|''Name''|GetPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|fetch and output a (list of) tiddler, section, slice or field using a predefined or custom format|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/GetPlugin.js|
|''Documentation''|http://get.tiddlyspace.com|
|''Version''|1.0.0 2013-08-22|
|''~CoreVersion''|2.6.2|
|''License''|Creative Commons 3.0|
!Code
***/
//{{{
(function ($j) {
    
    //define get macro
    config.macros.get = {

        //dictionary with terms
        dict: {
            errFunction: "Function undefined!",
            errFunctionInfo: "config.macros.get.get%0 is not a valid function!",
            defaultCategory: "Tiddler"
        },

        //default output templates
        template: {
            fuzzy: '%0',
            tiddler: '![[%1]]\n%0',
            section: '!%3 / [[%1]]\n%0',
            slice: ';%3\n:&raquo; %0',
            field: ';%3\n:&raquo; %0',
            tiddlerList: '!![[%1]]\n%0',
            sectionList: '!![[%1]]\n%0',
            sliceList: ';[[%1]]\n:&raquo; %0',
            fieldList: ';[[%1]]\n:&raquo; %0',
            tiddlerTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            sectionTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            sliceTable: '|[[%1]]|<<tiddler [[%4]]>>|',
            fieldTable: '|[[%1]]|%0|\n',
            tiddlerTableHead: '| !%0 | !Text |h',
            sectionTableHead: '| !%0 | !%1 |h',
            sliceTableHead: '| !%0 | !%1 |h',
            fieldTableHead: '| !%0 | !%1 |h',
            tableClass: 'getTable',
            dateFormat: '0DD.0MM.YYYY',
        },

        //the macro handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            //no params, nothing to get
            if (!paramString) return;

            //when fuzzy
            if ('~' == params[0]) {
                //remember
                var fuzzy = true;
                //remove first param
                params.shift();
            }

            //all other variables
            var $ = 0, $val = '', $vals = [], fmt, out = '', tid, v, val, vals,
                //output container
                $el = $j(place),
                //refresh status
                refresh = $el.attr('macroName') == 'get',
                //parse paramsString
                p = paramString.parseParams('anon', null, true)
                //get exec function from params or use getValues as default
                exec = this[getParam(p, 'exec', 'getValues')],
                //what to fetch
                what = params[0],
                //format
                format = getParam(p, 'format', ''),
                //output template
                template = store.getTiddlerText(getParam(p, 'template', '')),
                //filter to be used
                filter = getParam(p, 'filter'),
                //fetch plain or as key => value
                plain = params.contains('plain'),
                //get output template either as fuzzy or as table when specified or list when filter is used otherwise leave empty
                tpl = params.contains('table') ? 'Table' : (filter || params.contains('list') ? 'List' : ''),
                //helper
                as = tpl.toLowerCase(),
                //whether or not the first param is also a named parameter
                isNamed = null != getParam(p, what, null),
                //check for separators and split into array of [key,sep,value]
                ref = config.filters.get.delimiterRegExp.exec(what),
                //get tiddler from reference or as first param
                tiddler = ref ? ref[1] : what,
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
                cat = getParam(p, 'category', this.dict.defaultCategory),
                //what header to use depending on query
                header = getParam(p, 'header',
                    //empty when not table
                    as != 'table' ? '' :
                        // otherwise the first table row with the generic css classes
                        '|' +
                        this.template.tableClass + ' ' +
                        this.template.tableClass + type.toUpperCase() +
                        '|k\n' +
                        //and the corresponding (custom) table header
                        this.template[type + 'TableHead'].format([cat, element])
                    ),
                //what footer to use
                footer = getParam(p, 'footer', ''),
                //what separator to use for rendering result items
                separator = getParam(p, 'separator', '\n'),
                //get the outer tiddler
                t = story.findContainingTiddler(place);

            //if no tiddler is defined, get as outer tiddler
            tiddler = tiddler && !fuzzy ? tiddler : (t ? t.getAttribute('tiddler') : '');
            //none? (is shadow) => done
            if (!tiddler) return;

            //when to be gotten as plain, take value as is
            fmt = plain ? '%0' : (
                //when format defined use that otherwise use
                format ? format : (
                    //when template defined use that otherwise get template
                    template ? template : this.template[
                        //for fuzzy 
                        (fuzzy ? 'fuzzy' :
                            //for section or
                            (sep == '##' ? 'section' + tpl :
                                //for slice or
                                (sep == '::' ? 'slice' + tpl :
                                    //for field or otherwise for tiddler
                                    (sep == '??' ? 'field' + tpl :
                                                'tiddler' + tpl
                                        )
                                    )
                                )
                            )
                        ]
                    )
                );

            //if exec function can exists
            if (exec) {
                //execute to get values
                vals = exec.call(
                  this,
                  paramString,
                  fuzzy ? what : ( (as ? '' : tiddler) + sep + element ),
                  tiddler,
                  type,
                  element,
                  as,
                  fuzzy
                );
            //exec function defined that doesn't exist
            } else {
                //render error
                createTiddlyError(place, this.dict.noFunction, this.dict.errFunctionInfo.format([get]));
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
                ////fix code section
                val = val.indexOf('***/\n') != 0 ? val : val.substr(5);

                //loop all transclusion params
                for ($ = 1; $ < $vals.length; $++) {
                    //replace in value
                    val = val.replace(new RegExp('\\$' + $, 'mg'), $vals[$]);
                }

                //add to output
                out += (
                  //item prefix
                  prefix +
                  //item format
                  fmt.format([
                    val,
                    tid,
                    type,
                    element,
                    (as ? tid : '') + what,
                    cat
                  ]) +
                  //suffix
                  suffix
                //replace count
                ).replace(/\$count/mg, String.zeroPad(v + 1, vals.length.toString().length)) +
                  //add item separator for non-last
                  (as && v < vals.length - 1 ? separator : '');
            }

            //add to output
            out =
              //optional header
              (header ? header + '\n' : '') +
              out +
              //optional footer
              (footer ? '\n' + footer : '');

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
            wikify($j.trim(out), place);
        },

        //refresh function for tiddler updates
        refresh: function (el, paramString) {
            //clean output
            $j(el).empty();
            //invoke again
            this.handler(
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

                console.log('NS: ' + tid + '\n' + ns + '\n\n');

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
                        console.log('FIELD: ' + tid + '??' + fuzzy ? what : element + '\n' + v + '\n\n');
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
                            console.log('SLICE: ' + tid + '::' + what + '\n' + v + '\n\n');
                            //sliece value found?
                            if (v)
                                //set type
                                type = 'slice';
                            //no slice value found?
                            if (!v) {
                                //check for section
                                v = store.getTiddlerText(tid + '##' + what);
                                console.log('SECTION: ' + tid + '##' + what + '\n' + v + '\n\n');
                                //section value found?
                                if (v) 
                                    //set type
                                    type = 'section';
                            }
                            //no section found either?
                            if (!v) {
                                //get tiddler text
                                v = store.getTiddlerText(what);
                                console.log('TIDDLER: ' + what + '\n' + v + '\n\n');
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
                    if (d && !isNaN(d.getMonth)) v = d.formatString(this.template.dateFormat);

                    //add to values
                    if (v) vals.push([tid, v]);
                }
            }

            //return values as array
            return vals;
        }
    }

    //new get filter
    config.filters.get = function (results, match) {
        var
          //what to get
          ref = config.filters.get.delimiterRegExp.exec(match[3]),
          //depending on whether there was a separator get tiddler, separator and value
          tid = ref ? ref[1] : match[3],
          sep = ref ? ref[2] : '',
          val = ref ? ref[3] : '';

        //loop all tiddlers
        store.forEachTiddler(
          //recursively invoke this anonymous function
          function (title, tiddler) {
              if (
                //when tiddler matches
                tid && tid == title ||
                //or no tid specified and
                !tid && (
                  //when field query and lookup returns something
                  sep == '??' && store.getValue(title, val) ||
                  //when the generic lookup returns something
                  store.getTiddlerText(title + sep + val)
                )
              //add to matching tiddlers
              ) results.pushUnique(tiddler);
          });

        //return result list
        return results;
    };

    //delimiter regexp for get filter
    config.filters.get.delimiterRegExp = /(.*)?(\#\#|::|\?\?)(.*)/;

})(jQuery);
//}}}