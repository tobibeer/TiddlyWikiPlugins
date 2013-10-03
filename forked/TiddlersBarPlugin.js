/***
|''Name:''|TiddlersBarPlugin|
|''Description:''|A bar to switch between tiddlers through tabs (like browser tabs bar).|
|''Version:''|1.2.5|
|''Date:''|Jan 18,2008|
|''Source:''|http://visualtw.ouvaton.org/VisualTW.html|
|''Author:''|Pascal Collin|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.1.0|
|''Browser:''|Firefox 2.0; InternetExplorer 6.0, others|
!Demos
On [[homepage|http://visualtw.ouvaton.org/VisualTW.html]], open several tiddlers to use the tabs bar.
!Installation
#import this tiddler from [[homepage|http://visualtw.ouvaton.org/VisualTW.html]] (tagged as systemConfig)
#save and reload
#''if you're using a custom [[PageTemplate]]'', add {{{<div id='tiddlersBar' refresh='none' ondblclick='config.macros.tiddlersBar.onTiddlersBarAction(event)'></div>}}} before {{{<div id='tiddlerDisplay'></div>}}}
#optionally, adjust StyleSheetTiddlersBar
!Tips
*Doubleclick on the tiddlers bar (where there is no tab) create a new tiddler.
*Tabs include a button to close {{{x}}} or save {{{!}}} their tiddler.
*By default, click on the current tab close all others tiddlers.
!Configuration options 
<<option chkDisableTabsBar>> Disable the tabs bar (to print, by example).
<<option chkHideTabsBarWhenSingleTab >> Automatically hide the tabs bar when only one tiddler is displayed. 
<<option txtSelectedTiddlerTabButton>> ''selected'' tab command button.
<<option txtPreviousTabKey>> previous tab access key.
<<option txtNextTabKey>> next tab access key.
!Code
***/
//{{{
config.options.chkDisableTabsBar = config.options.chkDisableTabsBar ? config.options.chkDisableTabsBar : false;
config.options.chkHideTabsBarWhenSingleTab  = config.options.chkHideTabsBarWhenSingleTab  ? config.options.chkHideTabsBarWhenSingleTab  : false;
config.options.txtSelectedTiddlerTabButton = config.options.txtSelectedTiddlerTabButton ? config.options.txtSelectedTiddlerTabButton : "closeOthers";
config.options.txtPreviousTabKey = config.options.txtPreviousTabKey ? config.options.txtPreviousTabKey : "";
config.options.txtNextTabKey = config.options.txtNextTabKey ? config.options.txtNextTabKey : "";
config.macros.tiddlersBar = {
	tooltip : "see ",
	tooltipClose : "click here to close this tab",
	tooltipSave : "click here to save this tab",
	promptRename : "Enter tiddler new name",
	currentTiddler : "",
	previousState : false,
	previousKey : config.options.txtPreviousTabKey,
	nextKey : config.options.txtNextTabKey,	
	tabsAnimationSource : null, //use document.getElementById("tiddlerDisplay") if you need animation on tab switching.
	handler: function(place,macroName,params) {
		var previous = null;
		if (config.macros.tiddlersBar.isShown())
			story.forEachTiddler(function(title,e){
				if (title==config.macros.tiddlersBar.currentTiddler){
					var d = createTiddlyElement(null,"span",null,"tab tabSelected");
					config.macros.tiddlersBar.createActiveTabButton(d,title);
					if (previous && config.macros.tiddlersBar.previousKey) previous.setAttribute("accessKey",config.macros.tiddlersBar.nextKey);
					previous = "active";
				}
				else {
					var d = createTiddlyElement(place,"span",null,"tab tabUnselected");
					var btn = createTiddlyButton(d,title,config.macros.tiddlersBar.tooltip + title,config.macros.tiddlersBar.onSelectTab);
					btn.setAttribute("tiddler", title);
					if (previous=="active" && config.macros.tiddlersBar.nextKey) btn.setAttribute("accessKey",config.macros.tiddlersBar.previousKey);
					previous=btn;
				}
				var isDirty =story.isDirty(title);
				var c = createTiddlyButton(d,isDirty ?"!":"x",isDirty?config.macros.tiddlersBar.tooltipSave:config.macros.tiddlersBar.tooltipClose, isDirty ? config.macros.tiddlersBar.onTabSave : config.macros.tiddlersBar.onTabClose,"tabButton");
				c.setAttribute("tiddler", title);
				if (place.childNodes) {
					place.insertBefore(document.createTextNode(" "),place.firstChild); // to allow break line here when many tiddlers are open
					place.insertBefore(d,place.firstChild); 
				}
				else place.appendChild(d);
			})
	}, 
	refresh: function(place,params){
		removeChildren(place);
		config.macros.tiddlersBar.handler(place,"tiddlersBar",params);
		if (config.macros.tiddlersBar.previousState!=config.macros.tiddlersBar.isShown()) {
			story.refreshAllTiddlers();
			if (config.macros.tiddlersBar.previousState) story.forEachTiddler(function(t,e){e.style.display="";});
			config.macros.tiddlersBar.previousState = !config.macros.tiddlersBar.previousState;
		}
	},
	isShown : function(){
		if (config.options.chkDisableTabsBar) return false;
		if (!config.options.chkHideTabsBarWhenSingleTab) return true;
		var cpt=0;
		story.forEachTiddler(function(){cpt++});
		return (cpt>1);
	},
	selectNextTab : function(){  //used when the current tab is closed (to select another tab)
		var previous="";
		story.forEachTiddler(function(title){
			if (!config.macros.tiddlersBar.currentTiddler) {
				story.displayTiddler(null,title);
				return;
			}
			if (title==config.macros.tiddlersBar.currentTiddler) {
				if (previous) {
					story.displayTiddler(null,previous);
					return;
				}
				else config.macros.tiddlersBar.currentTiddler=""; 	// so next tab will be selected
			}
			else previous=title;
			});		
	},
	onSelectTab : function(e){
		var t = this.getAttribute("tiddler");
		if (t) story.displayTiddler(null,t);
		return false;
	},
	onTabClose : function(e){
		var t = this.getAttribute("tiddler");
		if (t) {
			if(story.hasChanges(t) && !readOnly) {
				if(!confirm(config.commands.cancelTiddler.warning.format([t])))
				return false;
			}
			story.closeTiddler(t);
		}
		return false;
	},
	onTabSave : function(e) {
		var t = this.getAttribute("tiddler");
		if (!e) e=window.event;
		if (t) config.commands.saveTiddler.handler(e,null,t);
		return false;
	},
	onSelectedTabButtonClick : function(event,src,title) {
		var t = this.getAttribute("tiddler");
		if (!event) event=window.event;
		if (t && config.options.txtSelectedTiddlerTabButton && config.commands[config.options.txtSelectedTiddlerTabButton])
			config.commands[config.options.txtSelectedTiddlerTabButton].handler(event, src, t);
		return false;
	},
	onTiddlersBarAction: function(event) {
		var source = event.target ? event.target.id : event.srcElement.id; // FF uses target and IE uses srcElement;
		if (source=="tiddlersBar") story.displayTiddler(null,'New Tiddler',DEFAULT_EDIT_TEMPLATE,false,null,null);
	},
	createActiveTabButton : function(place,title) {
		if (config.options.txtSelectedTiddlerTabButton && config.commands[config.options.txtSelectedTiddlerTabButton]) {
			var btn = createTiddlyButton(place, title, config.commands[config.options.txtSelectedTiddlerTabButton].tooltip ,config.macros.tiddlersBar.onSelectedTabButtonClick);
			btn.setAttribute("tiddler", title);
		}
		else
			createTiddlyText(place,title);
	}
}

story.coreCloseTiddler = story.coreCloseTiddler? story.coreCloseTiddler : story.closeTiddler;
story.coreDisplayTiddler = story.coreDisplayTiddler ? story.coreDisplayTiddler : story.displayTiddler;

story.closeTiddler = function(title,animate,unused) {
	if (title==config.macros.tiddlersBar.currentTiddler)
		config.macros.tiddlersBar.selectNextTab();
	story.coreCloseTiddler(title,false,unused); //disable animation to get it closed before calling tiddlersBar.refresh
	var e=document.getElementById("tiddlersBar");
	if (e) config.macros.tiddlersBar.refresh(e,null);
}

story.displayTiddler = function(srcElement,tiddler,template,animate,unused,customFields,toggle){
	story.coreDisplayTiddler(config.macros.tiddlersBar.tabsAnimationSource,tiddler,template,animate,unused,customFields,toggle);
	var title = (tiddler instanceof Tiddler)? tiddler.title : tiddler;  
	if (config.macros.tiddlersBar.isShown()) {
		story.forEachTiddler(function(t,e){
			if (t!=title) e.style.display="none";
			else e.style.display="";
		})
		config.macros.tiddlersBar.currentTiddler=title;
	}
	var e=document.getElementById("tiddlersBar");
	if (e) config.macros.tiddlersBar.refresh(e,null);
}

var coreRefreshPageTemplate = coreRefreshPageTemplate ? coreRefreshPageTemplate : refreshPageTemplate;
refreshPageTemplate = function(title) {
	coreRefreshPageTemplate(title);
	if (config.macros.tiddlersBar) config.macros.tiddlersBar.refresh(document.getElementById("tiddlersBar"));
}

ensureVisible=function (e) {return 0} //disable bottom scrolling (not useful now)

config.shadowTiddlers.StyleSheetTiddlersBar = "/*{{{*/\n";
config.shadowTiddlers.StyleSheetTiddlersBar += "#tiddlersBar .button {border:0}\n";
config.shadowTiddlers.StyleSheetTiddlersBar += "#tiddlersBar .tab {white-space:nowrap}\n";
config.shadowTiddlers.StyleSheetTiddlersBar += "#tiddlersBar {padding : 1em 0.5em 2px 0.5em}\n";
config.shadowTiddlers.StyleSheetTiddlersBar += ".tabUnselected .tabButton, .tabSelected .tabButton {padding : 0 2px 0 2px; margin: 0 0 0 4px;}\n";
config.shadowTiddlers.StyleSheetTiddlersBar += ".tiddler, .tabContents {border:1px [[ColorPalette::TertiaryPale]] solid;}\n";
config.shadowTiddlers.StyleSheetTiddlersBar +="/*}}}*/";
store.addNotification("StyleSheetTiddlersBar", refreshStyles);

config.refreshers.none = function(){return true;}
config.shadowTiddlers.PageTemplate=config.shadowTiddlers.PageTemplate.replace(/<div id='tiddlerDisplay'><\/div>/m,"<div id='tiddlersBar' refresh='none' ondblclick='config.macros.tiddlersBar.onTiddlersBarAction(event)'></div>\n<div id='tiddlerDisplay'></div>");

//}}}