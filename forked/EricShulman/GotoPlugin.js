/***
|Name|GotoPlugin|
|Source|http://www.TiddlyTools.com/#GotoPlugin|
|Documentation|http://www.TiddlyTools.com/#GotoPluginInfo|
|Version|1.9.2|
|Author|Eric Shulman|
|License|http://www.TiddlyTools.com/#LegalStatements|
|~CoreVersion|2.1|
|Type|plugin|
|Description|view any tiddler by entering it's title - displays list of possible matches|
''View a tiddler by typing its title and pressing //enter//.''  As you type, a list of possible matches is displayed.  You can scroll-and-click (or use arrows+enter) to select/view a tiddler, or press escape to close the listbox to resume typing.  When the listbox is not displayed, pressing //escape// clears the current input.
!!!Documentation
>see [[GotoPluginInfo]]
!!!Configuration
<<<
*Match titles only after {{twochar{<<option txtIncrementalSearchMin>>}}} or more characters are entered.<br>Use down-arrow to start matching with shorter input.  //Note: This option value is also set/used by [[SearchOptionsPlugin]]//.
*To set the maximum height of the listbox, you can create a tiddler tagged with <<tag systemConfig>>, containing:
//{{{
config.macros.gotoTiddler.listMaxSize=10;  // change this number
//}}}
<<<
!!!Revisions
<<<
2009.05.22 [1.9.2] use reverseLookup() for IncludePlugin
|please see [[GotoPluginInfo]] for additional revision details|
2006.05.05 [0.0.0] started
<<<
!!!Code
***/
//{{{
version.extensions.GotoPlugin= {major: 1, minor: 9, revision: 2, date: new Date(2009,5,22)};

// automatically tweak shadow SideBarOptions to add <<gotoTiddler>> macro above <<search>>
config.shadowTiddlers.SideBarOptions=config.shadowTiddlers.SideBarOptions.replace(/<<search>>/,"{{button{goto}}}\n<<gotoTiddler>><<search>>");

if (config.options.txtIncrementalSearchMin===undefined) config.options.txtIncrementalSearchMin=3;

config.macros.gotoTiddler= { 
	listMaxSize: 10,
	listHeading: 'Found %0 matching title%1...',
	searchItem: "Search for '%0'...",
	handler:
	function(place,macroName,params,wikifier,paramString,tiddler) {
		var quiet	=params.contains("quiet");
		var showlist	=params.contains("showlist");
		var search	=params.contains("search");
		params = paramString.parseParams("anon",null,true,false,false);
		var instyle	=getParam(params,"inputstyle","");
		var liststyle	=getParam(params,"liststyle","");
		var filter	=getParam(params,"filter","");
		var html=this.html;
		var keyevent=window.event?"onkeydown":"onkeypress"; // IE event fixup for ESC handling
		html=html.replace(/%keyevent%/g,keyevent);
		html=html.replace(/%search%/g,search);
		html=html.replace(/%quiet%/g,quiet);
		html=html.replace(/%showlist%/g,showlist);
		html=html.replace(/%display%/g,showlist?'block':'none');
		html=html.replace(/%position%/g,showlist?'static':'absolute');
		html=html.replace(/%instyle%/g,instyle);
		html=html.replace(/%liststyle%/g,liststyle);
		html=html.replace(/%filter%/g,filter);
		if (config.browser.isIE) html=this.IEtableFixup.format([html]);
		var span=createTiddlyElement(place,'span');
		span.innerHTML=html; var form=span.getElementsByTagName("form")[0];
		if (showlist) this.fillList(form.list,'',filter,search,0);
	},
	html:
	'<form onsubmit="return false" style="display:inline;margin:0;padding:0">\
		<input name=gotoTiddler type=text autocomplete="off" accesskey="G" style="%instyle%"\
			title="Enter title text... ENTER=goto, SHIFT-ENTER=search for text, DOWN=select from list"\
			onfocus="this.select(); this.setAttribute(\'accesskey\',\'G\');"\
			%keyevent%="return config.macros.gotoTiddler.inputEscKeyHandler(event,this,this.form.list,%search%,%showlist%);"\
			onkeyup="return config.macros.gotoTiddler.inputKeyHandler(event,this,%quiet%,%search%,%showlist%);">\
		<select name=list style="display:%display%;position:%position%;%liststyle%"\
			onchange="if (!this.selectedIndex) this.selectedIndex=1;"\
			onblur="this.style.display=%showlist%?\'block\':\'none\';"\
			%keyevent%="return config.macros.gotoTiddler.selectKeyHandler(event,this,this.form.gotoTiddler,%showlist%);"\
			onclick="return config.macros.gotoTiddler.processItem(this.value,this.form.gotoTiddler,this,%showlist%);">\
		</select><input name="filter" type="hidden" value="%filter%">\
	</form>',
	IEtableFixup:
	"<table style='width:100%;display:inline;padding:0;margin:0;border:0;'>\
		<tr style='padding:0;margin:0;border:0;'><td style='padding:0;margin:0;border:0;'>\
		%0</td></tr></table>",
	getItems:
	function(list,val,filter) {
		if (!list.cache || !list.cache.length || val.length<=config.options.txtIncrementalSearchMin) {
			// starting new search, fetch and cache list of tiddlers/shadows/tags
			list.cache=new Array();
			if (filter.length) {
				var fn=store.getMatchingTiddlers||store.getTaggedTiddlers;
				var tiddlers=store.sortTiddlers(fn.apply(store,[filter]),'title');
			} else 
				var tiddlers=store.reverseLookup('tags','excludeLists');
			for(var t=0; t<tiddlers.length; t++) list.cache.push(tiddlers[t].title);
			if (!filter.length) {
				for (var t in config.shadowTiddlers) list.cache.pushUnique(t);
				var tags=store.getTags();
				for(var t=0; t<tags.length; t++) list.cache.pushUnique(tags[t][0]);
			}
		}
		var found = [];
		var match=val.toLowerCase();
		for(var i=0; i<list.cache.length; i++)
			if (list.cache[i].toLowerCase().indexOf(match)!=-1) found.push(list.cache[i]);
		return found;
	},
	getItemSuffix:
	function(t) {
		if (store.tiddlerExists(t)) return "";  // tiddler
		if (store.isShadowTiddler(t)) return " (shadow)"; // shadow
		return " (tag)"; // tag 
	},
	fillList:
	function(list,val,filter,search,key) {
		if (list.style.display=="none") return; // not visible... do nothing!
		var indent='\xa0\xa0\xa0';
		var found = this.getItems(list,val,filter); // find matching items...
		found.sort(); // alpha by title
		while (list.length > 0) list.options[0]=null; // clear list
		var hdr=this.listHeading.format([found.length,found.length==1?"":"s"]);
		list.options[0]=new Option(hdr,"",false,false);
		for (var t=0; t<found.length; t++) list.options[list.length]=
			new Option(indent+found[t]+this.getItemSuffix(found[t]),found[t],false,false);
		if (search)
			list.options[list.length]=new Option(this.searchItem.format([val]),"*",false,false);
		list.size=(list.length<this.listMaxSize?list.length:this.listMaxSize); // resize list...
		list.selectedIndex=key==38?list.length-1:key==40?1:0;
	},
	keyProcessed:
	function(ev) { // utility function
		ev.cancelBubble=true; // IE4+
		try{event.keyCode=0;}catch(e){}; // IE5
		if (window.event) ev.returnValue=false; // IE6
		if (ev.preventDefault) ev.preventDefault(); // moz/opera/konqueror
		if (ev.stopPropagation) ev.stopPropagation(); // all
		return false;
	},
	inputEscKeyHandler:
	function(event,here,list,search,showlist) {
		if (event.keyCode==27) {
			if (showlist) { // clear input, reset list
				here.value=here.defaultValue;
				this.fillList(list,'',here.form.filter.value,search,0);
			}
			else if (list.style.display=="none") // clear input
				here.value=here.defaultValue;
			else list.style.display="none"; // hide list
			return this.keyProcessed(event);
		}
		return true; // key bubbles up
	},
	inputKeyHandler:
	function(event,here,quiet,search,showlist) {
		var key=event.keyCode;
		var list=here.form.list;
		var filter=here.form.filter;
		// non-printing chars bubble up, except for a few:
		if (key<48) switch(key) {
			// backspace=8, enter=13, space=32, up=38, down=40, delete=46
			case 8: case 13: case 32: case 38: case 40: case 46: break; default: return true;
		}
		// blank input... if down/enter... fall through (list all)... else, and hide or reset list
		if (!here.value.length && !(key==40 || key==13)) {
			if (showlist) this.fillList(here.form.list,'',here.form.filter.value,search,0);
			else list.style.display="none";
			return this.keyProcessed(event);
		}
		// hide list if quiet, or below input minimum (and not showlist)
		list.style.display=(!showlist&&(quiet||here.value.length<config.options.txtIncrementalSearchMin))?'none':'block';
		// non-blank input... enter=show/create tiddler, SHIFT-enter=search for text
		if (key==13 && here.value.length) return this.processItem(event.shiftKey?'*':here.value,here,list,showlist);
		// up or down key, or enter with blank input... shows and moves to list...
		if (key==38 || key==40 || key==13) { list.style.display="block"; list.focus(); }
		this.fillList(list,here.value,filter.value,search,key);
		return true; // key bubbles up
	},
	selectKeyHandler:
	function(event,list,editfield,showlist) {
		if (event.keyCode==27) // escape... hide list, move to edit field
			{ editfield.focus(); list.style.display=showlist?'block':'none'; return this.keyProcessed(event); }
		if (event.keyCode==13 && list.value.length) // enter... view selected item
			{ this.processItem(list.value,editfield,list,showlist); return this.keyProcessed(event); }
		return true; // key bubbles up
	},
	processItem:
	function(title,here,list,showlist) {
		if (!title.length) return;
		list.style.display=showlist?'block':'none';
		if (title=="*")	{ story.search(here.value); return false; } // do full-text search
		if (!showlist) here.value=title;
		story.displayTiddler(null,title); // show selected tiddler
		return false;
	}
}
//}}}