/***
|''Name''|BetterPopupsPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|stops the document from scrolling when openeing popups|
|''Documentation''|http://betterpopupsplugin.tiddlyspace.com|
|''Version''|0.1.0 (2013-10-06)|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/BetterPopupsPlugin.js|
***/
/*{{{*/
Popup.enableScrolling = false;
Popup.animDuration = 400;
Popup.show = function(valign,halign,offset)
{
	var curr = Popup.stack[Popup.stack.length-1];
	this.place(curr.root,curr.popup,valign,halign,offset);
	jQuery(curr.root).addClass("highlight");
	if(Popup.enableScrolling){
		if(config.options.chkAnimate && anim)
			jQuery('body,html')
				.animate(
					{scrollTop: ensureVisible(curr.popup)},
					Popup.animDuration
				);
		else
			window.scrollTo(0,ensureVisible(curr.popup));
	}
};
/*}}}*/