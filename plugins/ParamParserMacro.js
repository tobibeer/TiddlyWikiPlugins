/***
|''Name''|ParamParserMacro|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version''|1.0|
|''Description''|Displays how TiddlyWiki parses macro parameters.|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ParamParserMacro.js|
|''~CoreVersion''|2.6.1|
|''Documentation''|See below...|
''Note:'' Parameter evaluation may be turned off in a TiddlySpace!
!Usage
Use the {{{<<params>>}}} macro with parameters of your choice to see how TiddlyWiki would parse them.
{{{
<<params
  foo
  [[bar]]
  {{'baz'}}
  foo:bar
  baz:[[mumble]]
  bar:'keeper'
  bar:"tender"
  isTrue:{{!false}}
>>
}}}
<<params
  foo
  [[bar]]
  {{'baz'}}
  foo:bar
  baz:[[mumble]]
  bar:'keeper'
  bar:"tender"
  isTrue:{{!false}}
>>
!Code
***/
//{{{
(function ($) {

    config.macros.params = {
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var e, i, iColon, key, px = {},
            p = paramString.parseParams('anon', null, true),
            e = paramString.checkEval('foo', null, true),
            checkEval = /^(\{\{)(.*)(\}\})$/,

            out =
              "|>|>|>|>|>| !Params Array |\n" +
              "| !# | !params[#-1] " +
              "|min-width:60px; !type " +
              "|min-width:60px; !evaluated? " +
              "|min-width:60px; !key " +
              "|min-width:60px; !value |\n";

            for (i = 0; i < params.length; i++) {
                v = params[i];
                iColon = v.indexOf(':');
                key = p[0]['anon'] && p[0]['anon'].contains(v) ? null : v.substr(0, iColon);
                if (key) {
                    if (px[key] == undefined)
                        px[key] = 0;
                    else
                        px[key] = px[key] + 1;
                }

                out +=
                  "| " + (i + 1) + " |" +
                  "{{{ " + v + " }}}| " +
                  (key ? "named" : "simple") + " | " +
                  (e[i] == 0 ? "no" : (e[i] == 1 ? "yes" :
                    "<html>" +
                      "<a title='Evaluation may have failed because parameter evaluation is disabled, e.g. in TiddlySpace.' " +
                         "href='http://tiddlywiki.org/#%5B%5BEvaluated%20Parameters%5D%5D' " +
                         "target='_blank' class='externalLink'>" +
                          "failed" +
                      "</a>" +
                    "</html>"
                  )) + " |" +
                  (key ? key : "") + " |" +
                  (key ? p[0][key][px[key]] : v) + "|\n";
            }
            if (!i) out += "|>|>|>|>|>|//empty// |\n";

            out +=
              "|>|>|>|>|>|! Params parsed using...|\n" +
              "|>|>|>|>|>|padding:5px 20px; [[" +
                "p = paramString.parseParams('anon', null, true); |" +
                "http://tiddlywikidev.tiddlyspace.com/#String.prototype.parseParams()" +
              "]] |\n";

            i = 0;
            out +=
              "|>|>|>|>|>|!Simple Parameters|\n" +
              "|>|>|>|>|>|padding:5px 20px; as stored in array {{{p[0]['anon']}}} |\n";
            $.each(p[0], function (key, val) {
                if (key == 'anon') {
                    i++;
                    for (var v = 0; v < val.length; v++) {
                        out += "| ''[" + v + "] = ''|>|>|>|>|{{{" + val[v] + "}}}|\n";
                    }
                }
            });
            if (!i) out += "|>|>|>|>|>|//none// |\n";

            i = 0;
            out +=
              "|>|>|>|>|>|!Named Parameters|\n" +
              "|>|>|>|>|>|padding:5px 20px; fetched using [[" +
                "var fooVal = getParam(p,'foo',''); |" +
                "http://tiddlywikidev.tiddlyspace.com/#getParam()" +
              "]] |\n";

            $.each(p[0], function (key, val) {
                if (key != 'anon') {
                    i++;
                    out += "| ''" + key + " = ''|>|>|>|>|{{{" + getParam(p, key, '') + "}}}";
                    if (val.length > 1) {
                        out +=
                        "<br><br>There actually are multiple values for parameter ''" + key + "''!<br>" +
                        "If you -- as a developer -- want to support this,<br>" +
                        "do not use {{{" + key + "Val = getParam(p, '" + key + "', '');}}}.<br><br>" +
                        "Rather retrieve all values using<br>" +
                        "{{{" + key + "Arr = p[0]['" + key + "'];}}}.<br><br>" +
                        "Then, access your values like this:"
                        for (var v = 0; v < val.length; v++) {
                            out += "<br>''" + key + "Arr[" + v + "] = ''{{{" + val[v] + "}}}";
                        }
                    }
                    out += "|\n";
                }
            });
            if (!i) out += "|>|>|>|>|>|//none// |\n";

            out += "|>|>|>|>|>|!parsed paramString|\n" +
              "| ''p = ''|>|>|>|>|" +
              "<html><code style='white-space:pre'>" +
              JSON.stringify(p, undefined, 2).replace(/\n/mg, "</code><br /><code style='white-space:pre'>") +
              "</code></html>|\n";

            wikify(out, place);
            $('table', place).last().find('td').css('vertical-align', 'top');
        }
    };


    // Based on parseParams... only purpose is to check if params are evaluated

    // Parse a space-separated string of name:value parameters
    // The result is an array of objects:
    //   result[0] = object with a member for each parameter name, value of that member being an array of values
    //   result[1..n] = one object for each parameter, with 'name' and 'value' members
    String.prototype.checkEval = function (defaultName, defaultValue, allowEval, noNames, cascadeDefaults) {
        var count = 0;
        var evaluated = [];
        var parseToken = function (match, p) {
            var n;
            if (match[p]) // Double quoted
                n = match[p];
            else if (match[p + 1]) // Single quoted
                n = match[p + 1];
            else if (match[p + 2]) // Double-square-bracket quoted
                n = match[p + 2];
            else if (match[p + 3]) // Double-brace quoted
            {
                try {
                    n = match[p + 3];
                    if (allowEval && config.evaluateMacroParameters != "none") {
                        if (config.evaluateMacroParameters == "restricted") {
                            if (window.restrictedEval) {
                                n = window.restrictedEval(n);
                                evaluated.push(1);
                            } else {
                                evaluated.push(2);
                            }
                        } else {
                            n = window.eval(n);
                            evaluated.push(1);
                        }
                    } else {
                        evaluated.push(2);
                    }
                } catch (ex) {
                    evaluated.push(2);
                }
            }
            else if (match[p + 4]) // Unquoted
                n = match[p + 4];
            else if (match[p + 5]) // empty quote
                n = "";
            return n;
        };
        var r = [{}];
        var dblQuote = "(?:\"((?:(?:\\\\\")|[^\"])+)\")";
        var sngQuote = "(?:'((?:(?:\\\\\')|[^'])+)')";
        var dblSquare = "(?:\\[\\[((?:\\s|\\S)*?)\\]\\])";
        var dblBrace = "(?:\\{\\{((?:\\s|\\S)*?)\\}\\})";
        var unQuoted = noNames ? "([^\"'\\s]\\S*)" : "([^\"':\\s][^\\s:]*)";
        var emptyQuote = "((?:\"\")|(?:''))";
        var skipSpace = "(?:\\s*)";
        var token = "(?:" + dblQuote + "|" + sngQuote + "|" + dblSquare + "|" + dblBrace + "|" + unQuoted + "|" + emptyQuote + ")";
        var re = noNames ? new RegExp(token, "mg") : new RegExp(skipSpace + token + skipSpace + "(?:(\\:)" + skipSpace + token + ")?", "mg");
        var match;
        do {
            match = re.exec(this);
            if (match) {
                var n = parseToken(match, 1);
                var v = parseToken(match, 8);
                if (v == null && defaultName) {
                    v = n;
                    n = defaultName;
                } else if (v == null && defaultValue) {
                    v = defaultValue;
                }
                r.push({ name: n, value: v });
                if (cascadeDefaults) {
                    defaultName = n;
                    defaultValue = v;
                }
            }
            if (evaluated.length == count) evaluated.push(0);
            count++;
        } while (match);

        return evaluated;
    };

    if (window.location.href.indexOf('http://paramparser.tiddlyspace.com') >= 0)
        config.evaluateMacroParameters = "full";

})(jQuery);
//}}}