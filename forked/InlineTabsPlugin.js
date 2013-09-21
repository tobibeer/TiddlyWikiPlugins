/***
|''Name:''|InlineTabsPlugin|
|''Description:''|create tabs from inline tiddler text|
|''Documentation:''|http://inlinetabs.tiddlyspace.com|
|''Author:''|Saq Imtiaz / maintainer: [[Tobias Beer|http://tobibeer.tiddlyspace.com]] |
|''Version:''|2.1 (2013-09-21)|
|''~CoreVersion:''|2.2.2|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/InlineTabsPlugin.js|
|''License:''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]]|
***/
// /%
config.formatters.unshift( {
	name: "inlinetabs",

	match: "\\<tabs",
		lookaheadRegExp: /(?:<tabs (.*)>\n)((?:.|\n)*?)(?:\n<\/tabs>)/mg,

	handler: function(w) {

		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch && lookaheadMatch.index == w.matchStart)
			{
			 var m, tab,
			 	cookie = lookaheadMatch[1],
  			 	wrapper = createTiddlyElement(null,"div",null,cookie),
			 	tabset = createTiddlyElement(wrapper,"div",null,"tabset"),
				validTab = false,
			 	firstTab = '',
			 	tabregexp = /(?:<tab (.*)>)(?:(?:\n)?)((?:.|\n)*?)(?:<\/tab>)/mg;

			 tabset.setAttribute("cookie",cookie);

			 while((m = tabregexp.exec(lookaheadMatch[2])) != null)
				 {
				 if (firstTab == '') firstTab = m[1];
				 tab = createTiddlyButton(tabset,m[1],m[1],story.onClickInlineTab,"tab tabUnselected");
				 tab.setAttribute("tab",m[1]);
				 tab.setAttribute("content",m[2]);
				 tab.title = m[1];
				 if(config.options[cookie] == m[1])
					 validTab = true;
				 }
			 if(!validTab)
				 config.options[cookie] = firstTab;
			 w.output.appendChild(wrapper);
			 story.switchInlineTab(tabset,config.options[cookie]);
			 w.nextMatch = this.lookaheadRegExp.lastIndex;
			}
	}
});

Story.prototype.switchInlineTab = function(tabset,tab) {
	var t, tabContent,
		cookie = tabset.getAttribute("cookie"),
		theTab = null,
		nodes = tabset.childNodes;

	for(t=0; t<nodes.length; t++){
		if(nodes[t].getAttribute && nodes[t].getAttribute("tab") == tab) {
			theTab = nodes[t];
			theTab.className = "tab tabSelected";
		} else
			nodes[t].className = "tab tabUnselected";
	}

	if(theTab){
		if(tabset.nextSibling && tabset.nextSibling.className == "tabContents"){
			tabset.parentNode.removeChild(tabset.nextSibling);
		}
		tabContent = createTiddlyElement(null,"div",null,"tabContents");
		tabset.parentNode.insertBefore(tabContent,tabset.nextSibling);
		wikify(theTab.getAttribute("content"),tabContent);
		if(cookie){
			config.options[cookie] = tab;
			saveOptionCookie(cookie);
		}
	}
};
	
Story.prototype.onClickInlineTab = function(e){
	story.switchInlineTab( this.parentNode, this.getAttribute("tab"));
	return false;
};
// %/