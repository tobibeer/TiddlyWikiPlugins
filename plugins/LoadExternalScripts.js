/***
|''Name''|LoadExternalScripts.js|
|''Description''|Loads external plugins on startup|
|''Documentation''|http://tobibeer.tiddlyspace.com/#LoadExternal|
|''Author''|Tobias Beer|
|''Version''|0.1.2 (2010-10-05)|
|''Status''|beta|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/LoadExternalScripts.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
|''Contributions''|Codebase and original idea [[Saq Imtiaz|http://groups.google.com/group/TiddlyWikiDev/browse_thread/thread/7417b8332ad23a10/4ff4fa43141a20e6]]  as documented [[here|http://tiddlywiki.org/wiki/Dev:Developing_and_Testing_a_Plugin#The_Comprehensive_Method]] |
|''~CoreVersion''|2.5.3|
|''Type''|external script|
!Code
***/
//{{{
TiddlyWiki.prototype.isTiddler = function (title) {
    return store.tiddlerExists(title) || store.isShadowTiddler(title);
}

function loadExternal() {
    var fail = '', slash = true,
		t = "ExternalScripts",
		loc = getLocalPath(document.location.toString()),
		dir = loc.lastIndexOf("\\"),
		code, name, path, j, js;

    if (!store.isTiddler(t)) return;

    if (dir == -1) {
        dir = loc.lastIndexOf("/");
        slash = false;
    }
    path = loc.substr(0, dir) + (slash ? "\\" : "/");
    js = store.getTiddlerText(t).readBracketedList();
    for (j = 0; j < js.length; j++) {
        name = js[j];
        code = loadFile(path + name);
        if (!code) { fail += path + name + '\n'; continue; }
        try { eval(code); } catch (e) { fail = name + ': ' + e; break; }
        dir = name.lastIndexOf("\\");
        name = (dir >= 0 ? name.substr(dir + 1) : name);
        dir = name.lastIndexOf("\/");
        name = (dir >= 0 ? name.substr(dir + 1) : name);
        if (name.substr(name.length - 3) == '.js')
            name = name.substr(0, name.length - 3);
        config.shadowTiddlers[name] = code;
    }
    if (fail) confirm(
		'Failed to load the following external plugins as defined in your ' + t + '...\n' +
		fail
	);
}

loadPluginsEXT = window.loadPlugins;
window.loadPlugins = function () {
    loadPluginsEXT.apply(this, arguments);
    loadExternal.apply(this, arguments);
}

//FIX: to handle shadows
TiddlyWiki.prototype.getTiddlerText = function (title, defaultText) {
    if (!title)
        return defaultText;
    var pos = title.indexOf(config.textPrimitives.sectionSeparator);
    var section = null;
    if (pos != -1) {
        section = title.substr(pos + config.textPrimitives.sectionSeparator.length);
        title = title.substr(0, pos);
    }
    pos = title.indexOf(config.textPrimitives.sliceSeparator);
    if (pos != -1) {
        var slice = this.getTiddlerSlice(title.substr(0, pos), title.substr(pos + config.textPrimitives.sliceSeparator.length));
        if (slice)
            return slice;
    }

    var tiddler = this.fetchTiddler(title);

    //FIX: new variable 'text' for tiddler.text
    var text = tiddler ? tiddler.text : (this.isShadowTiddler(title) ? this.getShadowTiddlerText(title) : null);

    //check for text to get sections of shadows as well
    if (text) {
        if (!section) return text;
        var re = new RegExp("(^!{1,6}[ \t]*" + section.escapeRegExp() + "[ \t]*\n)", "mg");
        re.lastIndex = 0;
        var match = re.exec(text);
        if (match) {
            var t = text.substr(match.index + match[1].length);
            var re2 = /^!/mg;
            re2.lastIndex = 0;
            match = re2.exec(t); //# search for the next heading
            if (match)
                t = t.substr(0, match.index - 1);//# don't include final \n
            return t;
        }
        return defaultText;
    }
    if (defaultText != undefined)
        return defaultText;
    return null;
};

//}}}