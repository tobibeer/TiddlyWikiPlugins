/***
|''Name''|GetPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|fetch and output a (list of) tiddler, section, slice or field using a predefined or custom format|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/GetPlugin.js|
|''Documentation''|http://get.tiddlyspace.com|
|''Version''|0.9.5 2012-02-10 BETA|
|''~CoreVersion''|2.6.2|
|''License''|Creative Commons 3.0|
!Code
***/
//{{{
(function ($j) {

    config.shadowTiddlers.merge
    config.macros.get = {
        dict: {
            errFunction: "Function undefined!",
            errFunctionInfo: "config.macros.get.get%0 is not a valid function!",
            defaultCategory: "Tiddler"
        },
        template: {
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
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            if (!paramString) return;
            var $ = 0, $val = '', $vals = [], fmt, out = '', tid, v, val, vals,
                $el = $j(place),
                refresh = $el.attr('macroName') == 'get',
                what = params[0],
                p = paramString.parseParams('anon', null, true),
                exec = this[getParam(p, 'exec', 'getValues')],
                format = getParam(p, 'format', ''),
                template = store.getTiddlerText(getParam(p, 'template', '')),
                filter = getParam(p, 'filter'),
                plain = params.contains('plain'),
                tpl = params.contains('table') ? 'Table' :
                (filter || params.contains('list') ? 'List' : ''),
                as = tpl.toLowerCase(),
                isNamed = null != getParam(p, what, null),
                ref = config.filters.get.delimiterRegExp.exec(what),
                tiddler = ref ? ref[1] : what,
                sep = ref ? ref[2] : '',
                element = ref ? ref[3] : '',
                type =
                sep == '##' ? 'section' : (
                sep == '::' ? 'slice' : (
                sep == '??' ? 'field' : 'tiddler')),
                prefixv = getParam(p, 'valueprefix', ''),
                prefix = getParam(p, 'prefix', ''),
                suffix = getParam(p, 'suffix', ''),
                cat = getParam(p, 'category', this.dict.defaultCategory),
                header = getParam(p, 'header',
                as != 'table' ? '' :
                    '|' +
                    this.template.tableClass + ' ' +
                    this.template.tableClass + type.toUpperCase() +
                    '|k\n' +
                    this.template[type + 'TableHead'].format([cat, element])
                ),
                footer = getParam(p, 'footer', ''),
                separator = getParam(p, 'separator', '\n'),
                t = story.findContainingTiddler(place);

            tiddler = tiddler ? tiddler : (t ? t.getAttribute('tiddler') : '');
            if (!tiddler) return;

            fmt = plain ? '%0' : (
                  format ? format : (
                template ? template : this.template[
                  (sep == '##' ? 'section' + tpl :
                    (sep == '::' ? 'slice' + tpl :
                      (sep == '??' ? 'field' + tpl :
                                    'tiddler' + tpl
                      )
                    )
                  )
            ]
              )
            );

            if (exec) {
                vals = exec.call(
                  this,
                  paramString,
                  (as ? '' : tiddler) + sep + element,
                  tiddler,
                  type,
                  element,
                  as
                );
            } else {
                createTiddlyError(place, this.dict.noFunction, this.dict.errFunctionInfo.format([get]));
                return false;
            }

            do {
                $++;
                $vals.push($val);
                $val = getParam(p, '$' + $, null);
            } while ($val != null);

            for (v = 0; v < vals.length; v++) {
                tid = vals[v][0];
                val = prefixv + vals[v][1];

                val = val.indexOf('***/\n') != 0 ? val : val.substr(5); //fix code section

                for ($ = 1; $ < $vals.length; $++) {
                    val = val.replace(new RegExp('\\$' + $, 'mg'), $vals[$]);
                }

                out += (
                  prefix +
                  fmt.format([
                    val,
                    tid,
                    type,
                    element,
                    (as ? tid : '') + what,
                    cat
                  ]) +
                  suffix
                ).replace(/\$count/mg, String.zeroPad(v + 1, vals.length.toString().length)) +
                  (as && v < vals.length - 1 ? separator : '');
            }

            out =
              (header ? header + '\n' : '') +
              out +
              (footer ? '\n' + footer : '');

            if (!refresh) {
                $el = $j('<span />');
                $el.appendTo(place);
                place = $el[0];
            }

            wikify($j.trim(out), place);

            if (!refresh)
                $el.attr({
                    'refresh': 'macro',
                    'macroName': 'get',
                    'params': paramString
                });
        },
        refresh: function (el, paramString) {
            $j(el).empty();
            this.handler(
              el,
              'get',
              paramString.readMacroParams(),
              null,
              paramString
            );
        },
        getValues: function (paramString, what, tiddler, type, element, as) {
            var d, t, tid, tids, v, vals = [],
              p = paramString.parseParams('getval', null, true),
              filter = getParam(p, 'filter', null);

            tids = as ?
              (filter ? store.filterTiddlers(filter) : store.getTiddlers('title')) :
              [{ title: tiddler }];

            for (t = 0; t < tids.length; t++) {
                tid = tids[t].title;
                v = type == 'field' ?
                  store.getValue(tid, element) :
                  store.getTiddlerText((as ? tid : '') + what);

                d = v && v.length == 12 ? Date.convertFromYYYYMMDDHHMM(v) : undefined;
                if (d && !isNaN(d.getMonth)) v = d.formatString(this.template.dateFormat);

                if (v) vals.push([tid, v]);
            }

            return vals;
        }
    }

    config.filters.get = function (results, match) {
        var
          ref = config.filters.get.delimiterRegExp.exec(match[3]),
          tid = ref ? ref[1] : match[3],
          sep = ref ? ref[2] : '',
          val = ref ? ref[3] : '';

        store.forEachTiddler(
          function (title, tiddler) {
              if (
                tid && tid == title ||
                !tid && (
                  sep == '??' && store.getValue(title, val) ||
                  store.getTiddlerText(title + sep + val)
                )
              ) results.pushUnique(tiddler);
          });

        return results;
    };
    config.filters.get.delimiterRegExp = /(.*)?(\#\#|::|\?\?)(.*)/;

})(jQuery);
//}}}