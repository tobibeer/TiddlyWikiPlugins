/***
|''Name''|OpenTopPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]] / original by Saq Imtiaz|
|''Description''|open tiddlers at the top of the screen|
|''Version''|0.3.3 (2013-10-10)|
|''Requires''|2.5.2|
|''License''|CC BY-SA|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/OpenTopPlugin.js|
***/
/*{{{*/
Story.prototype.displayTiddlerOPENTOP = Story.prototype.displayTiddler;
Story.prototype.displayTiddler =
function (srcElement, tiddler, template, animate, unused, customFields, toggle,animationSrc) {
	srcElement = null;
	if(template!=2)this.closeTiddler((tiddler instanceof Tiddler) ? tiddler.title : tiddler);
	//call default
	var result = this.displayTiddlerOPENTOP.apply(this, arguments);
	if(template!=2)window.scrollTo(0,0);
	return result;
}
/*}}}*/