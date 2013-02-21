/***
|''Name''|ShowDown|
|''Description''|Allows to use MarkDown syntax in a tiddler|
|''Documentation''|http://tobibeer.tiddlyspace.com/#ShowDown|
|''Author''|Tobias Beer|
|''Contributions''|Mario Pietsch, Paul Downey|
|''Version''|0.9.0|
|''Requires''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ShowDown_lib.js|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ShowDown.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
|''~CoreVersion''|2.5.3|
|''Type''|plugin|
!Code
***/
//{{{
config.formatters.push({
    name: "showdown",
    match: "§§§",
    lookaheadRegExp: /\s?§§§((?:.|\n)*?)§§§\s?/mg,
    handler: function (w) {
        var match, t;
        this.lookaheadRegExp.lastIndex = w.matchStart;
        match = this.lookaheadRegExp.exec(w.source);
        if (match && match.index == w.matchStart) {
            t = (new Showdown.converter()).makeHtml(match[1]);
            wikify(
				'<html>' + t + '</html>',
				createTiddlyElement(w.output, 'div', null, 'showdown')
			)

            w.nextMatch = match.index + match[0].length;
        }
    }
})
//}}}