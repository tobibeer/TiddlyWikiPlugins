/***
|''Name''|OpenTopPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]] / original by Saq Imtiaz|
|''Description''|open tiddlers at the top of the screen|
|''Version''|0.3 (2013-10-07)|
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
	this.displayTiddlerOPENTOP.apply(this, arguments);
	window.scrollTo(0,0);
}
/*}}}*/