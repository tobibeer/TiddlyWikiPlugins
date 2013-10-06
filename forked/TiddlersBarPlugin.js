/***
|''Name:''|TiddlersBarPlugin|
|''Description:''|Provides browser-like tabs to switch between tiddlers.|
|''Author:''|Pascal Collin / fork: [[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|1.3.7 (2013-10-06)|
|''~CoreVersion:''|2.5.2|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/TiddlersBarPlugin.js|
|''License:''|[[BSD Open Source License|http://visualtw.ouvaton.org/VisualTW.html#License]]|
!Installation
#import this tiddler
#*tag it <<tag systemConfig>>
#save and reload
#when using a custom [[PageTemplate]], add the following before {{{<div id='tiddlerDisplay'></div>}}}:
#* {{{<div id='tiddlersBar' refresh='none' ondblclick='config.macros.tiddlersBar.onTiddlersBarAction(event)'></div>}}}
#optionally, adjust StyleSheetTiddlersBar
!Usage
*doubleclick on the tiddlers bar (where there is no tab) to create a new tiddler.
*tabs include a button to close {{{x}}} or save {{{!}}} the tiddler.
*by default, clicking on the current tab close all others tiddlers.
!Options 
<<option chkDisableTabsBar>> ''chkDisableTabsBar'' &nbsp; <<option chkHideTabsBarWhenSingleTab>> ''chkHideTabsBarWhenSingleTab''
;txtSelectedTiddlerTabButton
:<<option txtSelectedTiddlerTabButton>> (selected tab command)
;txtPreviousTabKey
:<<option txtPreviousTabKey>> (access key)
;txtNextTabKey
:<<option txtNextTabKey>> (access key)
!Code
***/
//{{{
(function($){

//shortcut
var co = config.options;

//default options
$.each({
	chkDisableTabsBar:false,
	chkHideTabsBarWhenSingleTab:false,
	txtSelectedTiddlerTabButton:"closeOthers",
	txtPreviousTabKey:"",
	txtNextTabKey:""
//loop them
},function(key,val){
	//set if not existing
	if(co[key] == undefined)co[key] = val;
});

var me = config.macros.tiddlersBar = {
	tooltip : "Show %0...",
	tooltipClose : "Close tiddler...",
	tooltipSave : "Save tiddler...",
	promptRename : "Enter new tiddler name",

	previousState : false,
	previousKey : co.txtPreviousTabKey,
	nextKey : co.txtNextTabKey,	

	//use document.getElementById("tiddlerDisplay") if you need animation on tab switching
	tabsAnimationSource : null,

	handler: function(place,macroName,params) {
		var btn, c, d, isDirty,
			previous = null;

		if (me.isShown()){
			story.forEachTiddler(function(title,e){
				if (title == me.currentTab){
					d = createTiddlyElement(null,"span",null,"tab tabSelected");
					me.createActiveTabButton(d,title);
					if (previous && me.previousKey)
						previous.setAttribute("accessKey", me.nextKey);
					previous = "active";
				} else {
					d = createTiddlyElement(place,"span",null,"tab tabUnselected");
					btn = createTiddlyButton(
						d,
						title,
						me.tooltip.format([title]),
						me.onSelectTab
					);
					btn.setAttribute("tiddler", title);
					if (previous=="active" && me.nextKey)
						btn.setAttribute("accessKey",me.previousKey);
					previous = btn;
				}
				isDirty = story.isDirty(title);
				c = createTiddlyButton(
					d,
					isDirty ? "!" : "x",
					isDirty ? me.tooltipSave : me.tooltipClose,
					isDirty ? me.onTabSave : me.onTabClose,
					"tabButton"
				);
				c.setAttribute("tiddler", title);
				if (place.childNodes) {
					// to allow break line here when many tiddlers are open
					place.insertBefore(document.createTextNode(" "),place.firstChild);
					place.insertBefore(d,place.firstChild); 
				}
				else place.appendChild(d);
			});
			me.paint();
		}
	}, 
	refresh: function(place,params){
		removeChildren(place);
		me.handler(place,"tiddlersBar",params);
		if (me.previousState != me.isShown()) {
			story.refreshAllTiddlers();
			if (me.previousState) story.forEachTiddler(function(t,e){e.style.display="";});
			me.previousState = !me.previousState;
		}
	},
	isShown : function(){
		if (co.chkDisableTabsBar) return false;
		if (!co.chkHideTabsBarWhenSingleTab) return true;
		var cpt=0;
		story.forEachTiddler(function(){cpt++});
		return (cpt>1);
	},
	//to select another tab when the current tab is closed
	selectNextTab : function(close){
		var previous="";
		story.forEachTiddler(function(title){
			if (!me.currentTab) {
				story.displayTiddler(null, title);
				return;
			}
			if (title == me.currentTab) {
				if (previous) {
					story.displayTiddler(null, previous);
					return;
				}
				//so next tab will be selected
				else me.currentTab = ""; 
			}
			else previous = title;
		});		
	},
	onSelectTab : function(e){
		var t = this.getAttribute("tiddler");
		if (t) story.displayTiddler(null, t);
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
		e = e || window.event;
		if (t) config.commands.saveTiddler.handler(e,null,t);
		return false;
	},
	onSelectedTabButtonClick : function(e,src,title) {
		var t = this.getAttribute("tiddler");
		e = e || window.event;
		if (
			t &&
			co.txtSelectedTiddlerTabButton &&
			config.commands[co.txtSelectedTiddlerTabButton]
		)
			config.commands[co.txtSelectedTiddlerTabButton].handler(e, src, t);
		return false;
	},
	onTiddlersBarAction: function(e) {
		//FF uses target and IE uses srcElement
		var source = e.target ? e.target.id : e.srcElement.id;
		if (source=="tiddlersBar")
			story.displayTiddler(null,'New Tiddler',DEFAULT_EDIT_TEMPLATE,false,null,null);
	},

	createActiveTabButton : function(place,title) {
		if (co.txtSelectedTiddlerTabButton &&
			config.commands[co.txtSelectedTiddlerTabButton]
		){
			var btn = createTiddlyButton(
				place,
				title,
				config.commands[co.txtSelectedTiddlerTabButton].tooltip,
				me.onSelectedTabButtonClick
			);
			btn.setAttribute("tiddler", title);
		}
		else {
			createTiddlyText(place,title);
			$('place').attr('title','');
		}
	},

	//paintr support
	paint: function(){
		paint = config.macros.paint;
		if(paint)
			$('#tiddlersBar .tab').each(function(){
				paint.setStyle(
					$(this),
					$(this).find('.tabButton').attr('tiddler'),
					'tab'
				);
			});
	}
}

Story.prototype.closeTiddlerTIDDLERSBAR = Story.prototype.closeTiddler;
Story.prototype.closeTiddler = function(title,animate,unused) {
	//no animation
	animate = false;
 	story.closeTiddlerTIDDLERSBAR.apply(this,arguments);
 	me.currentTab = '';
	me.selectNextTab();
	var e=document.getElementById("tiddlersBar");
	if (e) me.refresh(e,null);
}

Story.prototype.displayTiddlerTIDDLERSBAR = Story.prototype.displayTiddler;
Story.prototype.displayTiddler = function(srcElement,tiddler,template,animate,unused,customFields,toggle){
	//no source, no nasty animations
	srcElement = null;
	//always open top
	var e=document.getElementById("tiddlersBar");
	var result = story.displayTiddlerTIDDLERSBAR.apply(this, arguments);

	var title =
		result ?
		result.getAttribute('tiddler') :
		(tiddler instanceof Tiddler)? tiddler.title : tiddler;

	if (me.isShown()) {
		story.forEachTiddler(function(t,e){
			if (t!=title) e.style.display="none";
			else e.style.display="";
		})
		me.currentTab = title;
	}
	if (e) me.refresh(e,null);
	window.scrollTo(0,0);

	return result;
}

config.shadowTiddlers.StyleSheetTiddlersBar = [
	"/*{{{*/",
	"#tiddlersBar {padding : 1em 0.5em 0 0.5em;}",
	"#tiddlersBar .button {border:0;}",
	"#tiddlersBar .tab {border:0; border-top:2px [[ColorPalette::TertiaryPale]];border-bottom:2px solid [[ColorPalette::TertiaryPale]];white-space:nowrap; padding:2px 5px;}",
	"#tiddlersBar .tabSelected {background:transparent;border-top-color:transparent;}",
	"#tiddlersBar .tabUnselected {background:[[ColorPalette::TertiaryPale]]}",
	"#tiddlersBar a {color:[[ColorPalette::TertiaryDark]]}",
	"#tiddlersBar .button:hover,",
	"#tiddlersBar .tabButton:hover{background:transparent;color:[[ColorPalette::PrimaryDark]];}",
	".tabUnselected .tabButton,",
	".tabSelected .tabButton {padding : 0 2px 0 2px; margin: 0 0 0 4px; color: [[ColorPalette::TertiaryMid]];}",
	".tiddler, .tabContents {border:none;}",
	"/*}}}*/"
].join('\n');
store.addNotification("StyleSheetTiddlersBar", refreshStyles);

config.shadowTiddlers.PageTemplate=
config.shadowTiddlers.PageTemplate.replace(
	/<div id='tiddlerDisplay'><\/div>/m,
	[
		"<div id='tiddlersBar'",
		" refresh='none'",
		" ondblclick='config.macros.tiddlersBar.onTiddlersBarAction(event)'>",
		"</div>\n",
		"<div id='tiddlerDisplay'></div>"
	].join('')
);

refreshPageTemplateTIDDLERSBAR = refreshPageTemplate;
refreshPageTemplate = function(title) {
	refreshPageTemplateTIDDLERSBAR(title);
	if (me) me.refresh(document.getElementById("tiddlersBar"));
}
config.refreshers.none = function(){return true}

//disable bottom scrolling (not useful now)
// ensureVisible = function (e) {return 0}
// Mario Pietsch: removed as it causes a scroll to top when a popup opens

})(jQuery);
//}}}