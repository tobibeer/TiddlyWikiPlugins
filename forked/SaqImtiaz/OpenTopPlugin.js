/***
|''Name''|OpenTopPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.github.io]] / original by Saq Imtiaz|
|''Description''|open tiddlers at the top of the screen|
|''Version''|0.3.4 (2013-10-14)|
|''Requires''|2.5.2|
|''License''|CC BY-SA|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/SaqImtiaz/OpenTopPlugin.js|
***/
/*{{{*/
(function($){

Story.prototype.displayTiddlerOPENTOP = Story.prototype.displayTiddler;
Story.prototype.displayTiddler =
function (srcElement, tiddler, template, animate, unused, customFields, toggle,animationSrc) {
	srcElement = null;
	//get already open tiddler
	var tid = story.getTiddler((tiddler instanceof Tiddler) ? tiddler.title : tiddler);
	//if not edit mode and open => make first
	if(template!=2 && tid) $('#tiddlerDisplay').prepend(tid);
	//call default
	var result = this.displayTiddlerOPENTOP.apply(this, arguments);
	//scroll top, except when in edit mode
	if(template!=2) window.scrollTo(0,0);
	return result;
}

})(jQuery)
/*}}}*/