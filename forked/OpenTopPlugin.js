/***
|''Name''|OpenTopPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]] / original by Saq Imtiaz|
|''Description''|Open tiddlers at the top of the screen.|
|''Version''|0.2|
|''Requires''|2.5.2|
***/
// /%
Story.prototype.displayTiddlerOPENTOP = Story.prototype.displayTiddler;
Story.prototype.displayTiddler = function (srcElement,tiddler,template,animate,unused,customFields,toggle,animationSrc) {
	srcElement = null;
	this.closeTiddler((tiddler instanceof Tiddler) ? tiddler.title : tiddler);
    //call default
	this.displayTiddlerOPENTOP.apply(this, arguments);
	window.scrollTo(0,0);
}
// %/