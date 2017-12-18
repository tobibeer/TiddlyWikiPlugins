/***
|Name|ImportTiddlersPlugin|
|Source|http://www.TiddlyTools.com/#ImportTiddlersPlugin|
|Documentation|http://www.TiddlyTools.com/#ImportTiddlersPluginInfo|
|Version|4.6.2|
|Author|Eric Shulman|
|License|http://www.TiddlyTools.com/#LegalStatements|
|~CoreVersion|2.1|
|Type|plugin|
|Description|interactive controls for import/export with filtering.|
Combine tiddlers from any two TiddlyWiki documents.  Interactively select and copy tiddlers from another TiddlyWiki source document.  Includes prompting for skip, rename, merge or replace actions when importing tiddlers that match existing titles.  When done, a list of all imported tiddlers is written into [[ImportedTiddlers]].
!!!!!Documentation
<<<
see [[ImportTiddlersPluginInfo]] for details
<<<
!!!!!interactive control panel
<<<
<<importTiddlers inline>>
{{clear{
^^(see also: [[ImportTiddlers]] shadow tiddler)^^}}}
<<<
!!!!!Revisions
<<<
2011.02.14 4.6.2 fix OSX error: use picker.file.path
2009.10.10 4.6.1 in createImportPanel, Use {{{window.Components}}} instead of {{{config.browser.isGecko}}} to avoid applying FF3 'file browse' fixup in Chrome.
2009.10.06 4.6.0 added createTiddlerFromFile (import text files)
|please see [[ImportTiddlersPluginInfo]] for additional revision details|
2005.07.20 1.0.0 Initial Release
<<<
!!!!!Code
***/
//{{{
version.extensions.ImportTiddlersPlugin= {major: 4, minor: 6, revision: 2, date: new Date(2011,2,14)};

// IE needs explicit global scoping for functions/vars called from browser events
window.onClickImportButton=onClickImportButton;
window.refreshImportList=refreshImportList;

// default cookie/option values
if (!config.options.chkImportReport) config.options.chkImportReport=true;

// default shadow definition
config.shadowTiddlers.ImportTiddlers='<<importTiddlers inline>>';

// use shadow tiddler content in backstage panel
if (config.tasks) config.tasks.importTask.content='<<tiddler ImportTiddlers>>' // TW2.2 or above
//}}}
//{{{
// backward-compatiblity for TW2.0.x and TW1.2.x
if (config.macros.importTiddlers==undefined) config.macros.importTiddlers={};
if (typeof merge=='undefined') {
	function merge(dst,src,preserveExisting) {
		for(var i in src) { if(!preserveExisting || dst[i] === undefined) dst[i] = src[i]; }
		return dst;
	}
}
if (config.browser.isGecko===undefined)
	config.browser.isGecko=(config.userAgent.indexOf('gecko')!=-1);
//}}}
//{{{
merge(config.macros.importTiddlers,{
	$: function(id) { return document.getElementById(id); }, // abbreviation
	label: 'import tiddlers',
	prompt: 'Copy tiddlers from another document',
	openMsg: 'Opening %0',
	openErrMsg: 'Could not open %0 - error=%1',
	readMsg: 'Read %0 bytes from %1',
	foundMsg: 'Found %0 tiddlers in %1',
	filterMsg: "Filtered %0 tiddlers matching '%1'",
	summaryMsg: '%0 tiddler%1 in the list',
	summaryFilteredMsg: '%0 of %1 tiddler%2 in the list',
	plural: 's are',
	single: ' is',
	countMsg: '%0 tiddlers selected for import',
	processedMsg: 'Processed %0 tiddlers',
	importedMsg: 'Imported %0 of %1 tiddlers from %2',
	loadText: 'please load a document...',
	closeText: 'close',
	doneText: 'done',
	startText: 'import',
	stopText: 'stop',
	local: true,		// default to import from local file
	src: '',		// path/filename or URL of document to import (retrieved from SiteUrl)
	proxy: '',		// URL for remote proxy script (retrieved from SiteProxy)
	useProxy: false,	// use specific proxy script in front of remote URL
	inbound: null,		// hash-indexed array of tiddlers from other document
	newTags: '',		// text of tags added to imported tiddlers
	addTags: true,		// add new tags to imported tiddlers
	listsize: 10,		// # of lines to show in imported tiddler list
	importTags: true,	// include tags from remote source document when importing a tiddler
	keepTags: true,		// retain existing tags when replacing a tiddler
	sync: false,		// add 'server' fields to imported tiddlers (for sync function)
	lastFilter: '',		// most recent filter (URL hash) applied
	lastAction: null,	// most recent collision button performed
	index: 0,		// current processing index in import list
	sort: ''		// sort order for imported tiddler listbox
});
//}}}
//{{{
// hijack core macro handler
if (config.macros.importTiddlers.coreHandler==undefined)
	config.macros.importTiddlers.coreHandler=config.macros.importTiddlers.handler;

config.macros.importTiddlers.handler = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (!params[0] || params[0].toLowerCase()=='core') { // default to built in
		if (config.macros.importTiddlers.coreHandler)
			config.macros.importTiddlers.coreHandler.apply(this,arguments);
		else 
			createTiddlyButton(place,this.label,this.prompt,onClickImportMenu);
	} else if (params[0]=='link') { // show link to floating panel
		createTiddlyButton(place,params[1]||this.label,params[2]||this.prompt,onClickImportMenu);
	} else if (params[0]=='inline') {// show panel as INLINE tiddler content
		createImportPanel(place);
		this.$('importPanel').style.position='static';
		this.$('importPanel').style.display='block';
	} else if (config.macros.loadTiddlers)
		config.macros.loadTiddlers.handler(place,macroName,params); // any other params: loadtiddlers
}
//}}}
//{{{
// Handle link click to create/show/hide control panel
function onClickImportMenu(e) { var e=e||window.event;
	var parent=resolveTarget(e).parentNode;
	var panel=document.getElementById('importPanel');
	if (panel==undefined || panel.parentNode!=parent) panel=createImportPanel(parent);
	var isOpen=panel.style.display=='block';
	if(config.options.chkAnimate)
		anim.startAnimating(new Slider(panel,!isOpen,false,'none'));
	else
		panel.style.display=isOpen?'none':'block';
	e.cancelBubble = true; if (e.stopPropagation) e.stopPropagation(); return(false);
}
//}}}
//{{{
// Create control panel: HTML, CSS
function createImportPanel(place) {
	var cmi=config.macros.importTiddlers; // abbrev
	var panel=cmi.$('importPanel');
	if (panel) { panel.parentNode.removeChild(panel); }
	setStylesheet(store.getTiddlerText('ImportTiddlersPlugin##css'),'importTiddlers');
	panel=createTiddlyElement(place,'span','importPanel',null,null)
	panel.innerHTML=store.getTiddlerText('ImportTiddlersPlugin##html');
	refreshImportList();
	if (!cmi.src.length) cmi.src=store.getTiddlerText('SiteUrl')||'';
	cmi.$('importSourceURL').value=cmi.src;
	if (!cmi.proxy.length) cmi.proxy=store.getTiddlerText('SiteProxy')||'SiteProxy';
	cmi.$('importSiteProxy').value=cmi.proxy;
	if (window.Components) { // FF3 FIXUP
		cmi.$('fileImportSource').style.display='none';
		cmi.$('importLocalPanelFix').style.display='block';
	}
	cmi.$('chkSync').checked=cmi.sync;
	cmi.$('chkImportTags').checked=cmi.importTags;
	cmi.$('chkKeepTags').checked=cmi.keepTags;
	cmi.$('chkAddTags').checked=cmi.addTags;
	cmi.$('txtNewTags').value=cmi.newTags;
	cmi.$('txtNewTags').style.display=cmi.addTags?'block':'none';
	cmi.$('chkSync').checked=cmi.sync;
	cmi.$('chkImportReport').checked=config.options.chkImportReport;
	return panel;
}
//}}}
//{{{
// process control interactions
function onClickImportButton(which,event) {
	var cmi=config.macros.importTiddlers; // abbreviation
	var list=cmi.$('importList'); if (!list) return false;
	var thePanel=cmi.$('importPanel');
	var theCollisionPanel=cmi.$('importCollisionPanel');
	var theNewTitle=cmi.$('importNewTitle');
	var count=0;
	switch (which.id)
		{
		case 'importFromFile':	// show local panel
		case 'importFromWeb':	// show HTTP panel
			cmi.local=(which.id=='importFromFile');
			cmi.showPanel('importLocalPanel',cmi.local);
			cmi.showPanel('importHTTPPanel',!cmi.local);
			break;
		case 'importOptions':	// show/hide options panel
			cmi.showPanel('importOptionsPanel',cmi.$('importOptionsPanel').style.display=='none');
			break;
		case 'fileImportSource':
		case 'importLoad':		// load import source into hidden frame
			importReport();		// if an import was in progress, generate a report
			cmi.inbound=null;	// clear the imported tiddler buffer
			refreshImportList();	// reset/resize the listbox
			if (cmi.src=='') break;
			// Load document, read it's DOM and fill the list
			cmi.loadRemoteFile(cmi.src,cmi.filterTiddlerList);
			break;
		case 'importSelectFeed':	// select a pre-defined systemServer feed URL
			var p=Popup.create(which); if (!p) return false;
			var tids=store.getTaggedTiddlers('systemServer');
			if (!tids.length)
				createTiddlyText(createTiddlyElement(p,'li'),'no pre-defined server feeds');
			for (var t=0; t<tids.length; t++) {
				var u=store.getTiddlerSlice(tids[t].title,'URL');
				var d=store.getTiddlerSlice(tids[t].title,'Description');
				if (!d||!d.length) d=store.getTiddlerSlice(tids[t].title,'description');
				if (!d||!d.length) d=u;
				createTiddlyButton(createTiddlyElement(p,'li'),tids[t].title,d,
					function(){
						var u=this.getAttribute('url');
						document.getElementById('importSourceURL').value=u;
						config.macros.importTiddlers.src=u;
						document.getElementById('importLoad').onclick();
					},
					null,null,null,{url:u});
			}
			Popup.show();
			event.cancelBubble = true;
			if (event.stopPropagation) event.stopPropagation();
			return false;
			// create popup with feed list
			// onselect, insert feed URL into input field.
			break;
		case 'importSelectAll':		// select all tiddler list items (i.e., not headings)
			importReport();		// if an import was in progress, generate a report
			for (var t=0,count=0; t < list.options.length; t++) {
				if (list.options[t].value=='') continue;
				list.options[t].selected=true;
				count++;
			}
			clearMessage(); displayMessage(cmi.countMsg.format([count]));
			cmi.$('importStart').disabled=!count;
			break;
		case 'importSelectNew':		// select tiddlers not in current document
			importReport();		// if an import was in progress, generate a report
			for (var t=0,count=0; t < list.options.length; t++) {
				list.options[t].selected=false;
				if (list.options[t].value=='') continue;
				list.options[t].selected=!store.tiddlerExists(list.options[t].value);
				count+=list.options[t].selected?1:0;
			}
			clearMessage(); displayMessage(cmi.countMsg.format([count]));
			cmi.$('importStart').disabled=!count;
			break;
		case 'importSelectChanges':		// select tiddlers that are updated from existing tiddlers
			importReport();		// if an import was in progress, generate a report
			for (var t=0,count=0; t < list.options.length; t++) {
				list.options[t].selected=false;
				if (list.options[t].value==''||!store.tiddlerExists(list.options[t].value)) continue;
				for (var i=0; i<cmi.inbound.length; i++) // find matching inbound tiddler
					{ var inbound=cmi.inbound[i]; if (inbound.title==list.options[t].value) break; }
				list.options[t].selected=(inbound.modified-store.getTiddler(list.options[t].value).modified>0); // updated tiddler
				count+=list.options[t].selected?1:0;
			}
			clearMessage(); displayMessage(cmi.countMsg.format([count]));
			cmi.$('importStart').disabled=!count;
			break;
		case 'importSelectDifferences':		// select tiddlers that are new or different from existing tiddlers
			importReport();		// if an import was in progress, generate a report
			for (var t=0,count=0; t < list.options.length; t++) {
				list.options[t].selected=false;
				if (list.options[t].value=='') continue;
				if (!store.tiddlerExists(list.options[t].value)) { list.options[t].selected=true; count++; continue; }
				for (var i=0; i<cmi.inbound.length; i++) // find matching inbound tiddler
					{ var inbound=cmi.inbound[i]; if (inbound.title==list.options[t].value) break; }
				list.options[t].selected=(inbound.modified-store.getTiddler(list.options[t].value).modified!=0); // changed tiddler
				count+=list.options[t].selected?1:0;
			}
			clearMessage(); displayMessage(cmi.countMsg.format([count]));
			cmi.$('importStart').disabled=!count;
			break;
		case 'importApplyFilter':	// filter list to include only matching tiddlers
			importReport();		// if an import was in progress, generate a report
			clearMessage();
			if (!cmi.all) // no tiddlers loaded = '0 selected'
				{ displayMessage(cmi.countMsg.format([0])); return false; }
			var hash=cmi.$('importLastFilter').value;
			cmi.inbound=cmi.filterByHash('#'+hash,cmi.all);
			refreshImportList();	// reset/resize the listbox
			break;
		case 'importStart':		// initiate the import processing
			importReport();		// if an import was in progress, generate a report
			cmi.$('importApplyToAll').checked=false;
			cmi.$('importStart').value=cmi.stopText;
			if (cmi.index>0) cmi.index=-1; // stop processing
			else cmi.index=importTiddlers(0); // or begin processing
			importStopped();
			break;
		case 'importClose':		// unload imported tiddlers or hide the import control panel
			// if imported tiddlers not loaded, close the import control panel
			if (!cmi.inbound) { thePanel.style.display='none'; break; }
			importReport();		// if an import was in progress, generate a report
			cmi.inbound=null;	// clear the imported tiddler buffer
			refreshImportList();	// reset/resize the listbox
			break;
		case 'importSkip':	// don't import the tiddler
			cmi.lastAction=which;
			var theItem	= list.options[cmi.index];
			for (var j=0;j<cmi.inbound.length;j++)
			if (cmi.inbound[j].title==theItem.value) break;
			var theImported = cmi.inbound[j];
			theImported.status='skipped after asking';			// mark item as skipped
			theCollisionPanel.style.display='none';
			cmi.index=importTiddlers(cmi.index+1);	// resume with NEXT item
			importStopped();
			break;
		case 'importRename':		// change name of imported tiddler
			cmi.lastAction=which;
			var theItem		= list.options[cmi.index];
			for (var j=0;j<cmi.inbound.length;j++)
			if (cmi.inbound[j].title==theItem.value) break;
			var theImported		= cmi.inbound[j];
			theImported.status	= 'renamed from '+theImported.title;	// mark item as renamed
			theImported.set(theNewTitle.value,null,null,null,null);		// change the tiddler title
			theItem.value		= theNewTitle.value;			// change the listbox item text
			theItem.text		= theNewTitle.value;			// change the listbox item text
			theCollisionPanel.style.display='none';
			cmi.index=importTiddlers(cmi.index);	// resume with THIS item
			importStopped();
			break;
		case 'importMerge':	// join existing and imported tiddler content
			cmi.lastAction=which;
			var theItem	= list.options[cmi.index];
			for (var j=0;j<cmi.inbound.length;j++)
			if (cmi.inbound[j].title==theItem.value) break;
			var theImported	= cmi.inbound[j];
			var theExisting	= store.getTiddler(theItem.value);
			var theText	= theExisting.text+'\n----\n^^merged from: ';
			theText		+='[['+cmi.src+'#'+theItem.value+'|'+cmi.src+'#'+theItem.value+']]^^\n';
			theText		+='^^'+theImported.modified.toLocaleString()+' by '+theImported.modifier+'^^\n'+theImported.text;
			var theDate	= new Date();
			var theTags	= theExisting.getTags()+' '+theImported.getTags();
			theImported.set(null,theText,null,theDate,theTags);
			theImported.status   = 'merged with '+theExisting.title;	// mark item as merged
			theImported.status  += ' - '+theExisting.modified.formatString('MM/DD/YYYY 0hh:0mm:0ss');
			theImported.status  += ' by '+theExisting.modifier;
			theCollisionPanel.style.display='none';
			cmi.index=importTiddlers(cmi.index);	// resume with this item
			importStopped();
			break;
		case 'importReplace':		// substitute imported tiddler for existing tiddler
			cmi.lastAction=which;
			var theItem		  = list.options[cmi.index];
			for (var j=0;j<cmi.inbound.length;j++)
			if (cmi.inbound[j].title==theItem.value) break;
			var theImported     = cmi.inbound[j];
			var theExisting	  = store.getTiddler(theItem.value);
			theImported.status  = 'replaces '+theExisting.title;		// mark item for replace
			theImported.status += ' - '+theExisting.modified.formatString('MM/DD/YYYY 0hh:0mm:0ss');
			theImported.status += ' by '+theExisting.modifier;
			theCollisionPanel.style.display='none';
			cmi.index=importTiddlers(cmi.index);	// resume with THIS item
			importStopped();
			break;
		case 'importListSmaller':		// decrease current listbox size, minimum=5
			if (list.options.length==1) break;
			list.size-=(list.size>5)?1:0;
			cmi.listsize=list.size;
			break;
		case 'importListLarger':		// increase current listbox size, maximum=number of items in list
			if (list.options.length==1) break;
			list.size+=(list.size<list.options.length)?1:0;
			cmi.listsize=list.size;
			break;
		case 'importListMaximize':	// toggle listbox size between current and maximum
			if (list.options.length==1) break;
			list.size=(list.size==list.options.length)?cmi.listsize:list.options.length;
			break;
		}
}
//}}}
//{{{
config.macros.importTiddlers.showPanel=function(place,show,skipAnim) {
	if (typeof place=='string') var place=document.getElementById(place);
	if (!place||!place.style) return;
	if(!skipAnim && anim && config.options.chkAnimate) anim.startAnimating(new Slider(place,show,false,'none'));
	else place.style.display=show?'block':'none';
}
//}}}
//{{{
function refreshImportList(selectedIndex) {
	var cmi=config.macros.importTiddlers; // abbrev
	var list=cmi.$('importList'); if (!list) return;
	// if nothing to show, reset list content and size
	if (!cmi.inbound) {
		while (list.length > 0) { list.options[0] = null; }
		list.options[0]=new Option(cmi.loadText,'',false,false);
		list.size=cmi.listsize;
		cmi.$('importLoad').disabled=false;
		cmi.$('importLoad').style.display='inline';
		cmi.$('importStart').disabled=true;
		cmi.$('importOptions').disabled=true;
		cmi.$('importOptions').style.display='none';
		cmi.$('fileImportSource').disabled=false;
		cmi.$('importFromFile').disabled=false;
		cmi.$('importFromWeb').disabled=false;
		cmi.$('importStart').value=cmi.startText;
		cmi.$('importClose').value=cmi.doneText;
		cmi.$('importSelectPanel').style.display='none';
		cmi.$('importOptionsPanel').style.display='none';
		return;
	}
	// there are inbound tiddlers loaded...
	cmi.$('importLoad').disabled=true;
	cmi.$('importLoad').style.display='none';
	cmi.$('importOptions').style.display='inline';
	cmi.$('importOptions').disabled=false;
	cmi.$('fileImportSource').disabled=true;
	cmi.$('importFromFile').disabled=true;
	cmi.$('importFromWeb').disabled=true;
	cmi.$('importClose').value=cmi.closeText;
	if (cmi.$('importSelectPanel').style.display=='none')
		cmi.showPanel('importSelectPanel',true);

	// get the sort order
	if (!selectedIndex)   selectedIndex=0;
	if (selectedIndex==0) cmi.sort='title';		// heading
	if (selectedIndex==1) cmi.sort='title';
	if (selectedIndex==2) cmi.sort='modified';
	if (selectedIndex==3) cmi.sort='tags';
	if (selectedIndex>3) {
		// display selected tiddler count
		for (var t=0,count=0; t < list.options.length; t++) {
			if (!list.options[t].selected) continue;
			if (list.options[t].value!='')
				count+=1;
			else { // if heading is selected, deselect it, and then select and count all in section
				list.options[t].selected=false;
				for ( t++; t<list.options.length && list.options[t].value!=''; t++) {
					list.options[t].selected=true;
					count++;
				}
			}
		}
		clearMessage(); displayMessage(cmi.countMsg.format([count]));
	}
	cmi.$('importStart').disabled=!count;
	if (selectedIndex>3) return; // no refresh needed

	// get the alphasorted list of tiddlers
	var tiddlers=cmi.inbound;
	tiddlers.sort(function (a,b) {if(a['title'] == b['title']) return(0); else return (a['title'] < b['title']) ? -1 : +1; });
	// clear current list contents
	while (list.length > 0) { list.options[0] = null; }
	// add heading and control items to list
	var i=0;
	var indent=String.fromCharCode(160)+String.fromCharCode(160);
	if (cmi.all.length==tiddlers.length)
		var summary=cmi.summaryMsg.format([tiddlers.length,(tiddlers.length!=1)?cmi.plural:cmi.single]);
	else
		var summary=cmi.summaryFilteredMsg.format([tiddlers.length,cmi.all.length,(cmi.all.length!=1)?cmi.plural:cmi.single]);
	list.options[i++]=new Option(summary,'',false,false);
	list.options[i++]=new Option(((cmi.sort=='title'   )?'>':indent)+' [by title]','',false,false);
	list.options[i++]=new Option(((cmi.sort=='modified')?'>':indent)+' [by date]','',false,false);
	list.options[i++]=new Option(((cmi.sort=='tags')?'>':indent)+' [by tags]','',false,false);
	// output the tiddler list
	switch(cmi.sort) {
		case 'title':
			for(var t = 0; t < tiddlers.length; t++)
				list.options[i++] = new Option(tiddlers[t].title,tiddlers[t].title,false,false);
			break;
		case 'modified':
			// sort descending for newest date first
			tiddlers.sort(function (a,b) {if(a['modified'] == b['modified']) return(0); else return (a['modified'] > b['modified']) ? -1 : +1; });
			var lastSection = '';
			for(var t = 0; t < tiddlers.length; t++) {
				var tiddler = tiddlers[t];
				var theSection = tiddler.modified.toLocaleDateString();
				if (theSection != lastSection) {
					list.options[i++] = new Option(theSection,'',false,false);
					lastSection = theSection;
				}
				list.options[i++] = new Option(indent+indent+tiddler.title,tiddler.title,false,false);
			}
			break;
		case 'tags':
			var theTitles = {}; // all tiddler titles, hash indexed by tag value
			var theTags = new Array();
			for(var t=0; t<tiddlers.length; t++) {
				var title=tiddlers[t].title;
				var tags=tiddlers[t].tags;
				if (!tags || !tags.length) {
					if (theTitles['untagged']==undefined) { theTags.push('untagged'); theTitles['untagged']=new Array(); }
					theTitles['untagged'].push(title);
				}
				else for(var s=0; s<tags.length; s++) {
					if (theTitles[tags[s]]==undefined) { theTags.push(tags[s]); theTitles[tags[s]]=new Array(); }
					theTitles[tags[s]].push(title);
				}
			}
			theTags.sort();
			for(var tagindex=0; tagindex<theTags.length; tagindex++) {
				var theTag=theTags[tagindex];
				list.options[i++]=new Option(theTag,'',false,false);
				for(var t=0; t<theTitles[theTag].length; t++)
					list.options[i++]=new Option(indent+indent+theTitles[theTag][t],theTitles[theTag][t],false,false);
			}
			break;
		}
	list.selectedIndex=selectedIndex;		  // select current control item
	if (list.size<cmi.listsize) list.size=cmi.listsize;
	if (list.size>list.options.length) list.size=list.options.length;
}
//}}}
//{{{
// re-entrant processing for handling import with interactive collision prompting
function importTiddlers(startIndex) {
	var cmi=config.macros.importTiddlers; // abbrev
	if (!cmi.inbound) return -1;
	var list=cmi.$('importList'); if (!list) return;
	var t;
	// if starting new import, reset import status flags
	if (startIndex==0)
		for (var t=0;t<cmi.inbound.length;t++)
			cmi.inbound[t].status='';
	for (var i=startIndex; i<list.options.length; i++) {
		// if list item is not selected or is a heading (i.e., has no value), skip it
		if ((!list.options[i].selected) || ((t=list.options[i].value)==''))
			continue;
		for (var j=0;j<cmi.inbound.length;j++)
			if (cmi.inbound[j].title==t) break;
		var inbound = cmi.inbound[j];
		var theExisting = store.getTiddler(inbound.title);
		// avoid redundant import for tiddlers that are listed multiple times (when 'by tags')
		if (inbound.status=='added')
			continue;
		// don't import the 'ImportedTiddlers' history from the other document...
		if (inbound.title=='ImportedTiddlers')
			continue;
		// if tiddler exists and import not marked for replace or merge, stop importing
		if (theExisting && (inbound.status.substr(0,7)!='replace') && (inbound.status.substr(0,5)!='merge'))
			return i;
		// assemble tags (remote + existing + added)
		var newTags = '';
		if (cmi.importTags)
			newTags+=inbound.getTags()	// import remote tags
		if (cmi.keepTags && theExisting)
			newTags+=' '+theExisting.getTags(); // keep existing tags
		if (cmi.addTags && cmi.newTags.trim().length)
			newTags+=' '+cmi.newTags; // add new tags
		inbound.set(null,null,null,null,newTags.trim());
		// set the status to 'added' (if not already set by the 'ask the user' UI)
		inbound.status=(inbound.status=='')?'added':inbound.status;
		// set sync fields
		if (cmi.sync) {
			if (!inbound.fields) inbound.fields={}; // for TW2.1.x backward-compatibility
			inbound.fields['server.page.revision']=inbound.modified.convertToYYYYMMDDHHMM();
			inbound.fields['server.type']='file';
			inbound.fields['server.host']=(cmi.local&&!cmi.src.startsWith('file:')?'file:///':'')+cmi.src;
		}
		// do the import!
		store.suspendNotifications();
		store.saveTiddler(inbound.title, inbound.title, inbound.text, inbound.modifier, inbound.modified, inbound.tags, inbound.fields, true, inbound.created);
                store.fetchTiddler(inbound.title).created = inbound.created; // force creation date to imported value (needed for TW2.1.x and earlier)
		store.resumeNotifications();
		}
	return(-1);	// signals that we really finished the entire list
}
function importStopped() {
	var cmi=config.macros.importTiddlers; // abbrev
	var list=cmi.$('importList'); if (!list) return;
	var theNewTitle=cmi.$('importNewTitle');
	if (cmi.index==-1){ 
		cmi.$('importStart').value=cmi.startText;
		importReport();	// import finished... generate the report
	} else {
		// import collision...
		// show the collision panel and set the title edit field
		cmi.$('importStart').value=cmi.stopText;
		cmi.showPanel('importCollisionPanel',true);
		theNewTitle.value=list.options[cmi.index].value;
		if (cmi.$('importApplyToAll').checked && cmi.lastAction && cmi.lastAction.id!='importRename')
			onClickImportButton(cmi.lastAction);
	}
}
//}}}
//{{{
function importReport() {
	var cmi=config.macros.importTiddlers; // abbrev
	if (!cmi.inbound) return;
	// if import was not completed, the collision panel will still be open... close it now.
	var panel=cmi.$('importCollisionPanel'); if (panel) panel.style.display='none';
	// get the alphasorted list of tiddlers
	var tiddlers = cmi.inbound;
	// gather the statistics
	var count=0; var total=0;
	for (var t=0; t<tiddlers.length; t++) {
		if (!tiddlers[t].status || !tiddlers[t].status.trim().length) continue;
		if (tiddlers[t].status.substr(0,7)!='skipped') count++;
		total++;
	}
	// generate a report
	if (total) displayMessage(cmi.processedMsg.format([total]));
	if (count && config.options.chkImportReport) {
		// get/create the report tiddler
		var theReport = store.getTiddler('ImportedTiddlers');
		if (!theReport) { theReport=new Tiddler(); theReport.title='ImportedTiddlers'; theReport.text=''; }
		// format the report content
		var now = new Date();
		var newText = 'On '+now.toLocaleString()+', '+config.options.txtUserName
		newText +=' imported '+count+' tiddler'+(count==1?'':'s')+' from\n[['+cmi.src+'|'+cmi.src+']]:\n';
		if (cmi.addTags && cmi.newTags.trim().length)
			newText += 'imported tiddlers were tagged with: "'+cmi.newTags+'"\n';
		newText += '<<<\n';
		for (var t=0; t<tiddlers.length; t++) if (tiddlers[t].status)
			newText += '#[['+tiddlers[t].title+']] - '+tiddlers[t].status+'\n';
		newText += '<<<\n';
		// update the ImportedTiddlers content and show the tiddler
		theReport.text	 = newText+((theReport.text!='')?'\n----\n':'')+theReport.text;
		theReport.modifier = config.options.txtUserName;
		theReport.modified = new Date();
                store.saveTiddler(theReport.title, theReport.title, theReport.text, theReport.modifier, theReport.modified, theReport.tags, theReport.fields);
		story.displayTiddler(null,theReport.title,1,null,null,false);
		story.refreshTiddler(theReport.title,1,true);
	}
	// reset status flags
	for (var t=0; t<cmi.inbound.length; t++) cmi.inbound[t].status='';
	// mark document as dirty and let display update as needed
	if (count) { store.setDirty(true); store.notifyAll(); }
	// always show final message when tiddlers were actually loaded
	if (count) displayMessage(cmi.importedMsg.format([count,tiddlers.length,cmi.src.replace(/%20/g,' ')]));
}
//}}}
//{{{
// // File and XMLHttpRequest I/O
config.macros.importTiddlers.askForFilename=function(here) {
	var msg=here.title; // use tooltip as dialog box message
	var path=getLocalPath(document.location.href);
	var slashpos=path.lastIndexOf('/'); if (slashpos==-1) slashpos=path.lastIndexOf('\\'); 
	if (slashpos!=-1) path = path.substr(0,slashpos+1); // remove filename from path, leave the trailing slash
	var file='';
	var result='';
	if(window.Components) { // moz
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');

			var nsIFilePicker = window.Components.interfaces.nsIFilePicker;
			var picker = Components.classes['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
			picker.init(window, msg, nsIFilePicker.modeOpen);
			var thispath = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			thispath.initWithPath(path);
			picker.displayDirectory=thispath;
			picker.defaultExtension='html';
			picker.defaultString=file;
			picker.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterText|nsIFilePicker.filterHTML);
			if (picker.show()!=nsIFilePicker.returnCancel) var result=picker.file.path;
		}
		catch(e) { alert('error during local file access: '+e.toString()) }
	}
	else { // IE
		try { // XPSP2 IE only
			var s = new ActiveXObject('UserAccounts.CommonDialog');
			s.Filter='All files|*.*|Text files|*.txt|HTML files|*.htm;*.html|';
			s.FilterIndex=3; // default to HTML files;
			s.InitialDir=path;
			s.FileName=file;
			if (s.showOpen()) var result=s.FileName;
		}
		catch(e) {  // fallback
			var result=prompt(msg,path+file);
		}
	}
	return result;
}

config.macros.importTiddlers.loadRemoteFile = function(src,callback) {
	if (src==undefined || !src.length) return null; // filename is required
	var original=src; // URL as specified
	var hashpos=src.indexOf('#'); if (hashpos!=-1) src=src.substr(0,hashpos); // URL with #... suffix removed (needed for IE)
	clearMessage();
	displayMessage(this.openMsg.format([src.replace(/%20/g,' ')]));
	if (src.substr(0,5)!='http:' && src.substr(0,5)!='file:') { // if not a URL, read from local filesystem
		var txt=loadFile(src);
		if (!txt) { // file didn't load, might be relative path.. try fixup
			var pathPrefix=document.location.href;  // get current document path and trim off filename
			var slashpos=pathPrefix.lastIndexOf('/'); if (slashpos==-1) slashpos=pathPrefix.lastIndexOf('\\'); 
			if (slashpos!=-1 && slashpos!=pathPrefix.length-1) pathPrefix=pathPrefix.substr(0,slashpos+1);
			src=pathPrefix+src;
			if (pathPrefix.substr(0,5)!='http:') src=getLocalPath(src);
			var txt=loadFile(src);
		}
		if (!txt) { // file still didn't load, report error
			displayMessage(config.macros.importTiddlers.openErrMsg.format([src.replace(/%20/g,' '),'(filesystem error)']));
		} else {
			displayMessage(config.macros.importTiddlers.readMsg.format([txt.length,src.replace(/%20/g,' ')]));
			if (version.major+version.minor*.1+version.revision*.01!=2.52) txt=convertUTF8ToUnicode(txt);
			if (callback) callback(true,original,txt,src,null);
		}
	} else {
		doHttp('GET',src,null,null,config.options.txtRemoteUsername,config.options.txtRemotePassword,callback,original,null);
	}
}

config.macros.importTiddlers.readTiddlersFromHTML=function(html){
	var remoteStore=new TiddlyWiki();
	remoteStore.importTiddlyWiki(html);
	return remoteStore.getTiddlers('title');	
}

config.macros.importTiddlers.readTiddlersFromCSV=function(CSV){
	var remoteStore=new TiddlyWiki();
	// GET NAMES
	var lines=CSV.replace(/\r/g,'').split('\n');
	var names=lines.shift().replace(/"/g,'').split(',');
	CSV=lines.join('\n');
	// ENCODE commas and newlines within quoted values
	var comma='!~comma~!'; var commaRE=new RegExp(comma,'g');
	var newline='!~newline~!'; var newlineRE=new RegExp(newline,'g');
	CSV=CSV.replace(/"([^"]*?)"/g,
		function(x){ return x.replace(/\,/g,comma).replace(/\n/g,newline); });
	// PARSE lines
	var lines=CSV.split('\n');
	for (var i=0; i<lines.length; i++) { if (!lines[i].length) continue;
		var values=lines[i].split(',');
		// DECODE commas, newlines, and doubled-quotes, and remove enclosing quotes (if any)
		for (var v=0; v<values.length; v++)
			values[v]=values[v].replace(commaRE,',').replace(newlineRE,'\n')
				.replace(/^"|"$/g,'').replace(/""/g,'"');
		// EXTRACT tiddler values
		var title=''; var text=''; var tags=[]; var fields={};
		var created=null; var when=new Date(); var who=config.options.txtUserName;
		for (var v=0; v<values.length; v++) { var val=values[v];
			if (names[v]) switch(names[v].toLowerCase()) {
				case 'title':	title=val.replace(/\[\]\|/g,'_'); break;
				case 'created': created=new Date(val); break;
				case 'modified':when=new Date(val); break;
				case 'modifier':who=val; break;
				case 'text':	text=val; break;
				case 'tags':	tags=val.readBracketedList(); break;
				default:	fields[names[v].toLowerCase()]=val; break;
			}
		}
		// CREATE tiddler in temporary store
		if (title.length)
			remoteStore.saveTiddler(title,title,text,who,when,tags,fields,true,created||when);
	}
	return remoteStore.getTiddlers('title');
}

config.macros.importTiddlers.createTiddlerFromFile=function(src,txt) {
	var t=new Tiddler();
	var pos=src.lastIndexOf("/"); if (pos==-1) pos=src.lastIndexOf("\\");
	t.title=pos==-1?src:src.substr(pos+1);
	t.text=txt; 
	t.created=t.modified=new Date();
	t.modifier=config.options.txtUserName;
	if (src.substr(src.length-3,3)=='.js') t.tags=['systemConfig'];
	return [t];
}

config.macros.importTiddlers.filterTiddlerList=function(success,params,txt,src,xhr){
	var cmi=config.macros.importTiddlers; // abbreviation
	var src=src.replace(/%20/g,' ');
	if (!success) { displayMessage(cmi.openErrMsg.format([src,xhr.status])); return; }
	cmi.all=cmi.readTiddlersFromHTML(txt);
	if (!cmi.all||!cmi.all.length) cmi.all=cmi.readTiddlersFromCSV(txt)
	if (!cmi.all||!cmi.all.length) cmi.all=cmi.createTiddlerFromFile(src,txt)
	var count=cmi.all?cmi.all.length:0;
	var querypos=src.lastIndexOf('?'); if (querypos!=-1) src=src.substr(0,querypos);
	displayMessage(cmi.foundMsg.format([count,src]));
	cmi.inbound=cmi.filterByHash(params,cmi.all); // use full URL including hash (if any)
	cmi.$('importLastFilter').value=cmi.lastFilter;
	window.refreshImportList(0);
}

config.macros.importTiddlers.filterByHash=function(src,tiddlers){
	var hashpos=src.lastIndexOf('#'); if (hashpos==-1) return tiddlers;
	var hash=src.substr(hashpos+1); if (!hash.length) return tiddlers;
	var tids=[];
	var params=hash.parseParams('anon',null,true,false,false);
	for (var p=1; p<params.length; p++) {
		switch (params[p].name) {
			case 'anon':
			case 'open':
				tids.pushUnique(params[p].value);
				break;
			case 'tag':
				if (store.getMatchingTiddlers) { // for boolean expressions - see MatchTagsPlugin
					var r=store.getMatchingTiddlers(params[p].value,null,tiddlers);
					for (var t=0; t<r.length; t++) tids.pushUnique(r[t].title);
				} else for (var t=0; t<tiddlers.length; t++)
					if (tiddlers[t].isTagged(params[p].value))
						tids.pushUnique(tiddlers[t].title);
				break;
			case 'story':
				for (var t=0; t<tiddlers.length; t++)
					if (tiddlers[t].title==params[p].value) {
						tiddlers[t].changed();
						for (var s=0; s<tiddlers[t].links.length; s++)
							tids.pushUnique(tiddlers[t].links[s]);
						break;
					}
				break;
			case 'search':
				for (var t=0; t<tiddlers.length; t++)
					if (tiddlers[t].text.indexOf(params[p].value)!=-1)
						tids.pushUnique(tiddlers[t].title);
				break;
		}
	}
	var matches=[];
	for (var t=0; t<tiddlers.length; t++)
		if (tids.contains(tiddlers[t].title))
			matches.push(tiddlers[t]);
	displayMessage(config.macros.importTiddlers.filterMsg.format([matches.length,hash]));
	config.macros.importTiddlers.lastFilter=hash;
	return matches;
}
//}}}
/***
!!!Control panel CSS
//{{{
!css
#importPanel {
	display: none; position:absolute; z-index:11; width:35em; right:105%; top:3em;
	background-color: #eee; color:#000; font-size: 8pt; line-height:110%;
	border:1px solid black; border-bottom-width: 3px; border-right-width: 3px;
	padding: 0.5em; margin:0em; -moz-border-radius:1em;-webkit-border-radius:1em;
}
#importPanel a, #importPanel td a { color:#009; display:inline; margin:0px; padding:1px; }
#importPanel table { width:100%; border:0px; padding:0px; margin:0px; font-size:8pt; line-height:110%; background:transparent; }
#importPanel tr { border:0px;padding:0px;margin:0px; background:transparent; }
#importPanel td { color:#000; border:0px;padding:0px;margin:0px; background:transparent; }
#importPanel select { width:100%;margin:0px;font-size:8pt;line-height:110%;}
#importPanel input  { width:98%;padding:0px;margin:0px;font-size:8pt;line-height:110%}
#importPanel .box { border:1px solid #000; background-color:#eee; padding:3px 5px; margin-bottom:5px; -moz-border-radius:5px;-webkit-border-radius:5px;}
#importPanel .topline { border-top:1px solid #999; padding-top:2px; margin-top:2px; }
#importPanel .rad { width:auto; }
#importPanel .chk { width:auto; margin:1px;border:0; }
#importPanel .btn { width:auto; }
#importPanel .btn1 { width:98%; }
#importPanel .btn2 { width:48%; }
#importPanel .btn3 { width:32%; }
#importPanel .btn4 { width:23%; }
#importPanel .btn5 { width:19%; }
#importPanel .importButton { padding: 0em; margin: 0px; font-size:8pt; }
#importPanel .importListButton { padding:0em 0.25em 0em 0.25em; color: #000000; display:inline }
#backstagePanel #importPanel { left:10%; right:auto; }
!end
//}}}
!!!Control panel HTML
//{{{
!html
<!-- source and report -->
<table><tr><td align=left>
	import from
	<input type="radio" class="rad" name="importFrom" id="importFromFile" value="file" CHECKED
		onclick="onClickImportButton(this,event)" title="show file controls"> local file
	<input type="radio" class="rad" name="importFrom" id="importFromWeb"  value="http"
		onclick="onClickImportButton(this,event)" title="show web controls"> web server
</td><td align=right>
	<input type=checkbox class="chk" id="chkImportReport"
		onClick="config.options['chkImportReport']=this.checked;"> create report
</td></tr></table>

<div class="box" id="importSourcePanel" style="margin:.5em">
<div id="importLocalPanel" style="display:block;margin-bottom:2px;"><!-- import from local file  -->
enter or browse for source path/filename<br>
<input type="file" id="fileImportSource" size=57 style="width:100%"
	onKeyUp="config.macros.importTiddlers.src=this.value"
	onChange="config.macros.importTiddlers.src=this.value;document.getElementById('importLoad').onclick()">
<div id="importLocalPanelFix" style="display:none"><!-- FF3 FIXUP -->
	<input type="text" id="fileImportSourceFix" style="width:90%"
		title="Enter a path/file to import"
		onKeyUp="config.macros.importTiddlers.src=this.value"
		onChange="config.macros.importTiddlers.src=this.value;document.getElementById('importLoad').onclick()">
	<input type="button" id="fileImportSourceFixButton" style="width:7%" value="..."
		title="Select a path/file to import"
		onClick="var r=config.macros.importTiddlers.askForFilename(this); if (!r||!r.length) return;
			document.getElementById('fileImportSourceFix').value=r;
			config.macros.importTiddlers.src=r;
			document.getElementById('importLoad').onclick()">
</div><!--end FF3 FIXUP-->
</div><!--end local-->
<div id="importHTTPPanel" style="display:none;margin-bottom:2px;"><!-- import from http server -->
<table><tr><td align=left>
	enter a URL or <a href="javascript:;" id="importSelectFeed"
		onclick="return onClickImportButton(this,event)" title="select a pre-defined 'systemServer' URL">
		select a server</a><br>
</td><td align=right>
	<input type="checkbox" class="chk" id="importUsePassword"
		onClick="config.macros.importTiddlers.usePassword=this.checked;
			config.macros.importTiddlers.showPanel('importIDPWPanel',this.checked,true);">password
	<input type="checkbox" class="chk" id="importUseProxy"
		onClick="config.macros.importTiddlers.useProxy=this.checked;
			config.macros.importTiddlers.showPanel('importSiteProxy',this.checked,true);">proxy
</td></tr></table>
<input type="text" id="importSiteProxy" style="display:none;margin-bottom:1px" onfocus="this.select()" value="SiteProxy"
	onKeyUp="config.macros.importTiddlers.proxy=this.value"
	onChange="config.macros.importTiddlers.proxy=this.value;">
<input type="text" id="importSourceURL" onfocus="this.select()" value="SiteUrl"
	onKeyUp="config.macros.importTiddlers.src=this.value"
	onChange="config.macros.importTiddlers.src=this.value;">
<div id="importIDPWPanel" style="text-align:center;margin-top:2px;display:none";>
username: <input type=text id="txtImportID" style="width:25%" 
	onChange="config.options.txtRemoteUsername=this.value;">
 password: <input type=password id="txtImportPW" style="width:25%" 
	onChange="config.options.txtRemotePassword=this.value;">
</div><!--end idpw-->
</div><!--end http-->
</div><!--end source-->

<div class="box" id="importSelectPanel" style="display:none;margin:.5em;">
<table><tr><td align=left>
select:
<a href="javascript:;" id="importSelectAll"
	onclick="return onClickImportButton(this)" title="SELECT all tiddlers">
	all</a>
&nbsp;<a href="javascript:;" id="importSelectNew"
	onclick="return onClickImportButton(this)" title="SELECT tiddlers not already in destination document">
	added</a>
&nbsp;<a href="javascript:;" id="importSelectChanges"
	onclick="return onClickImportButton(this)" title="SELECT tiddlers that have been updated in source document">
	changes</a>
&nbsp;<a href="javascript:;" id="importSelectDifferences"
	onclick="return onClickImportButton(this)" title="SELECT tiddlers that have been added or are different from existing tiddlers">
	differences</a>
</td><td align=right>
<a href="javascript:;" id="importListSmaller"
	onclick="return onClickImportButton(this)" title="SHRINK list size">
	&nbsp;&#150;&nbsp;</a>
<a href="javascript:;" id="importListLarger"
	onclick="return onClickImportButton(this)" title="GROW list size">
	&nbsp;+&nbsp;</a>
<a href="javascript:;" id="importListMaximize"
	onclick="return onClickImportButton(this)" title="MAXIMIZE/RESTORE list size">
	&nbsp;=&nbsp;</a>
</td></tr></table>
<select id="importList" size=8 multiple
	onchange="setTimeout('refreshImportList('+this.selectedIndex+')',1)">
	<!-- NOTE: delay refresh so list is updated AFTER onchange event is handled -->
</select>
<div style="text-align:center">
	<a href="javascript:;"
		title="click for help using filters..."
		onclick="alert('A filter consists of one or more space-separated combinations of: tiddlertitle, tag:[[tagvalue]], tag:[[tag expression]] (requires MatchTagsPlugin), story:[[TiddlerName]], and/or search:[[searchtext]]. Use a blank filter to restore the list of all tiddlers.'); return false;"
	>filter</a>
	<input type="text" id="importLastFilter" style="margin-bottom:1px; width:65%"
		title="Enter a combination of one or more filters. Use a blank filter for all tiddlers."
		onfocus="this.select()" value=""
		onKeyUp="config.macros.importTiddlers.lastFilter=this.value"
		onChange="config.macros.importTiddlers.lastFilter=this.value;">
	<input type="button" id="importApplyFilter" style="width:20%" value="apply"
		title="filter list of tiddlers to include only those that match certain criteria"
		onclick="return onClickImportButton(this)">
	</div>
</div><!--end select-->

<div class="box" id="importOptionsPanel" style="text-align:center;margin:.5em;display:none;">
	apply tags: <input type=checkbox class="chk" id="chkImportTags" checked
		onClick="config.macros.importTiddlers.importTags=this.checked;">from source&nbsp;
	<input type=checkbox class="chk" id="chkKeepTags" checked
		onClick="config.macros.importTiddlers.keepTags=this.checked;">keep existing&nbsp;
	<input type=checkbox class="chk" id="chkAddTags" 
		onClick="config.macros.importTiddlers.addTags=this.checked;
			config.macros.importTiddlers.showPanel('txtNewTags',this.checked,false);
			if (this.checked) document.getElementById('txtNewTags').focus();">add tags<br>
	<input type=text id="txtNewTags" style="margin-top:4px;display:none;" size=15 onfocus="this.select()" 
		title="enter tags to be added to imported tiddlers" 
		onKeyUp="config.macros.importTiddlers.newTags=this.value;
		document.getElementById('chkAddTags').checked=this.value.length>0;" autocomplete=off>
	<nobr><input type=checkbox class="chk" id="chkSync" 
		onClick="config.macros.importTiddlers.sync=this.checked;">
		link tiddlers to source document (for sync later)</nobr>
</div><!--end options-->

<div id="importButtonPanel" style="text-align:center">
	<input type=button id="importLoad"	class="importButton btn3" value="open"
		title="load listbox with tiddlers from source document"
		onclick="onClickImportButton(this)">
	<input type=button id="importOptions"	class="importButton btn3" value="options..."
		title="set options for tags, sync, etc."
		onclick="onClickImportButton(this)">
	<input type=button id="importStart"	class="importButton btn3" value="import"
		title="start/stop import of selected source tiddlers into current document"
		onclick="onClickImportButton(this)">
	<input type=button id="importClose"	class="importButton btn3" value="done"
		title="clear listbox or hide control panel"
		onclick="onClickImportButton(this)">
</div>

<div class="none" id="importCollisionPanel" style="display:none;margin:.5em 0 .5em .5em;">
	<table><tr><td style="width:65%" align="left">
		<table><tr><td align=left>
			tiddler already exists:
		</td><td align=right>
			<input type=checkbox class="chk" id="importApplyToAll" 
			onclick="document.getElementById('importRename').disabled=this.checked;"
			checked>apply to all
		</td></tr></table>
		<input type=text id="importNewTitle" size=15 autocomplete=off">
	</td><td style="width:34%" align="center">
		<input type=button id="importMerge"
			class="importButton" style="width:47%" value="merge"
			title="append the incoming tiddler to the existing tiddler"
			onclick="onClickImportButton(this)"><!--
		--><input type=button id="importSkip"
			class="importButton" style="width:47%" value="skip"
			title="do not import this tiddler"
			onclick="onClickImportButton(this)"><!--
		--><br><input type=button id="importRename"
			class="importButton" style="width:47%" value="rename"
			title="rename the incoming tiddler"
			onclick="onClickImportButton(this)"><!--
		--><input type=button id="importReplace"
			class="importButton" style="width:47%" value="replace"
			title="discard the existing tiddler"
			onclick="onClickImportButton(this)">
	</td></tr></table>
</div><!--end collision-->
!end
//}}}
***/
 