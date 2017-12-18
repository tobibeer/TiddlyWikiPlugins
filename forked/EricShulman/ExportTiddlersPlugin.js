/***
|Name|ExportTiddlersPlugin|
|Source|http://www.TiddlyTools.com/#ExportTiddlersPlugin|
|Documentation|http://www.TiddlyTools.com/#ExportTiddlersPluginInfo|
|Version|2.9.6|
|Author|Eric Shulman|
|License|http://www.TiddlyTools.com/#LegalStatements|
|~CoreVersion|2.1|
|Type|plugin|
|Description|interactively select/export tiddlers to a separate file|
!!!!!Documentation
>see [[ExportTiddlersPluginInfo]]
!!!!!Inline control panel (live):
><<exportTiddlers inline>>
!!!!!Revisions
<<<
2011.02.14 2.9.6 fix OSX error: use picker.file.path
2010.02.25 2.9.5 added merge checkbox option and improved 'merge' status message
|please see [[ExportTiddlersPluginInfo]] for additional revision details|
2005.10.09 0.0.0 development started
<<<
!!!!!Code
***/
//{{{
// version
version.extensions.ExportTiddlersPlugin= {major: 2, minor: 9, revision: 6, date: new Date(2011,2,14)};

// default shadow definition
config.shadowTiddlers.ExportTiddlers='<<exportTiddlers inline>>';

// add 'export' backstage task (following built-in import task)
if (config.tasks) { // TW2.2 or above
	config.tasks.exportTask = {
		text:'export',
		tooltip:'Export selected tiddlers to another file',
		content:'<<exportTiddlers inline>>'
	}
	config.backstageTasks.splice(config.backstageTasks.indexOf('importTask')+1,0,'exportTask');
}

config.macros.exportTiddlers = {
	$: function(id) { return document.getElementById(id); }, // abbreviation
	label: 'export tiddlers',
	prompt: 'Copy selected tiddlers to an export document',
	okmsg: '%0 tiddler%1 written to %2',
	failmsg: 'An error occurred while creating %1',
	overwriteprompt: '%0\ncontains %1 tiddler%2 that will be discarded or replaced',
	mergestatus: '%0 tiddler%1 added, %2 tiddler%3 updated, %4 tiddler%5 unchanged',
	statusmsg: '%0 tiddler%1 - %2 selected for export',
	newdefault: 'export.html',
	datetimefmt: '0MM/0DD/YYYY 0hh:0mm:0ss',  // for 'filter date/time' edit fields
	type_TW: "tw", type_PS: "ps", type_TX: "tx", type_CS: "cs", type_NF: "nf", // file type tokens
	type_map: { // maps type param to token values
		tiddlywiki:"tw", tw:"tw", wiki: "tw",
		purestore: "ps", ps:"ps", store:"ps",
		plaintext: "tx", tx:"tx", text: "tx",
		comma:     "cs", cs:"cs", csv:  "cs",
		newsfeed:  "nf", nf:"nf", xml:  "nf", rss:"nf"
	},
	handler: function(place,macroName,params) {
		if (params[0]!='inline')
			{ createTiddlyButton(place,this.label,this.prompt,this.togglePanel); return; }
		var panel=this.createPanel(place);
		panel.style.position='static';
		panel.style.display='block';
	},
	createPanel: function(place) {
		var panel=this.$('exportPanel');
		if (panel) { panel.parentNode.removeChild(panel); }
		setStylesheet(store.getTiddlerText('ExportTiddlersPlugin##css',''),'exportTiddlers');
		panel=createTiddlyElement(place,'span','exportPanel',null,null)
		panel.innerHTML=store.getTiddlerText('ExportTiddlersPlugin##html','');
		this.initFilter();
		this.refreshList(0);
		var fn=this.$('exportFilename');
		if (window.location.protocol=='file:' && !fn.value.length) {
			// get new target path/filename
			var newPath=getLocalPath(window.location.href);
			var slashpos=newPath.lastIndexOf('/'); if (slashpos==-1) slashpos=newPath.lastIndexOf('\\'); 
			if (slashpos!=-1) newPath=newPath.substr(0,slashpos+1); // trim filename
			fn.value=newPath+this.newdefault;
		}
		return panel;
	},
	togglePanel: function(e) { var e=e||window.event;
		var cme=config.macros.exportTiddlers; // abbrev
		var parent=resolveTarget(e).parentNode;
		var panel=cme.$('exportPanel');
		if (panel==undefined || panel.parentNode!=parent)
			panel=cme.createPanel(parent);
		var isOpen=panel.style.display=='block';
		if(config.options.chkAnimate)
			anim.startAnimating(new Slider(panel,!isOpen,e.shiftKey || e.altKey,'none'));
		else
			panel.style.display=isOpen?'none':'block' ;
		if (panel.style.display!='none') {
			cme.refreshList(0);
			cme.$('exportFilename').focus(); 
			cme.$('exportFilename').select();
		}
		e.cancelBubble = true; if (e.stopPropagation) e.stopPropagation(); return(false);
	},
	process: function(which) { // process panel control interactions
		var theList=this.$('exportList'); if (!theList) return false;
		var count = 0;
		var total = store.getTiddlers('title').length;
		switch (which.id) {
			case 'exportFilter':
				count=this.filterExportList();
				var panel=this.$('exportFilterPanel');
				if (count==-1) { panel.style.display='block'; break; }
				this.$('exportStart').disabled=(count==0);
				this.$('exportDelete').disabled=(count==0);
				this.displayStatus(count,total);
				if (count==0) { alert('No tiddlers were selected'); panel.style.display='block'; }
				break;
			case 'exportStart':
				this.go();
				break;
			case 'exportDelete':
				this.deleteTiddlers();
				break;
			case 'exportHideFilter':
			case 'exportToggleFilter':
				var panel=this.$('exportFilterPanel')
				panel.style.display=(panel.style.display=='block')?'none':'block';
				break;
			case 'exportSelectChanges':
				var lastmod=new Date(document.lastModified);
				for (var t = 0; t < theList.options.length; t++) {
					if (theList.options[t].value=='') continue;
					var tiddler=store.getTiddler(theList.options[t].value); if (!tiddler) continue;
					theList.options[t].selected=(tiddler.modified>lastmod);
					count += (tiddler.modified>lastmod)?1:0;
				}
				this.$('exportStart').disabled=(count==0);
				this.$('exportDelete').disabled=(count==0);
				this.displayStatus(count,total);
				if (count==0) alert('There are no unsaved changes');
				break;
			case 'exportSelectAll':
				for (var t = 0; t < theList.options.length; t++) {
					if (theList.options[t].value=='') continue;
					theList.options[t].selected=true;
					count += 1;
				}
				this.$('exportStart').disabled=(count==0);
				this.$('exportDelete').disabled=(count==0);
				this.displayStatus(count,count);
				break;
			case 'exportSelectOpened':
				for (var t=0; t<theList.options.length; t++) theList.options[t].selected=false;
				var tiddlerDisplay=this.$('tiddlerDisplay');
				for (var t=0; t<tiddlerDisplay.childNodes.length;t++) {
					var tiddler=tiddlerDisplay.childNodes[t].id.substr(7);
					for (var i=0; i<theList.options.length; i++) {
						if (theList.options[i].value!=tiddler) continue;
						theList.options[i].selected=true; count++; break;
					}
				}
				this.$('exportStart').disabled=(count==0);
				this.$('exportDelete').disabled=(count==0);
				this.displayStatus(count,total);
				if (count==0) alert('There are no tiddlers currently opened');
				break;
			case 'exportSelectRelated':
				// recursively build list of related tiddlers
				function getRelatedTiddlers(tid,tids) {
					var t=store.getTiddler(tid); if (!t || tids.contains(tid)) return tids;
					tids.push(t.title);
					if (!t.linksUpdated) t.changed();
					for (var i=0; i<t.links.length; i++)
						if (t.links[i]!=tid) tids=getRelatedTiddlers(t.links[i],tids);
					return tids;
				}
				// for all currently selected tiddlers, gather up the related tiddlers (including self) and select them as well
				var tids=[];
				for (var i=0; i<theList.options.length; i++)
					if (theList.options[i].selected) tids=getRelatedTiddlers(theList.options[i].value,tids);
				// select related tiddlers (includes original selected tiddlers)
				for (var i=0; i<theList.options.length; i++)
					theList.options[i].selected=tids.contains(theList.options[i].value);
				this.displayStatus(tids.length,total);
				break;
			case 'exportListSmaller':	// decrease current listbox size
				var min=5;
				theList.size-=(theList.size>min)?1:0;
				break;
			case 'exportListLarger':	// increase current listbox size
				var max=(theList.options.length>25)?theList.options.length:25;
				theList.size+=(theList.size<max)?1:0;
				break;
			case 'exportClose':
				this.$('exportPanel').style.display='none';
				break;
		}
		return false;
	},
	displayStatus: function(count,total) {
		var txt=this.statusmsg.format([total,total!=1?'s':'',!count?'none':count==total?'all':count]);
		clearMessage();	displayMessage(txt);
		return txt;
	},
	refreshList: function(selectedIndex) {
		var theList = this.$('exportList'); if (!theList) return;
		// get the sort order
		var sort;
		if (!selectedIndex)   selectedIndex=0;
		if (selectedIndex==0) sort='modified';
		if (selectedIndex==1) sort='title';
		if (selectedIndex==2) sort='modified';
		if (selectedIndex==3) sort='modifier';
		if (selectedIndex==4) sort='tags';

		// unselect headings and count number of tiddlers actually selected
		var count=0;
		for (var t=5; t < theList.options.length; t++) {
			if (!theList.options[t].selected) continue;
			if (theList.options[t].value!='')
				count++;
			else { // if heading is selected, deselect it, and then select and count all in section
				theList.options[t].selected=false;
				for ( t++; t<theList.options.length && theList.options[t].value!=''; t++) {
					theList.options[t].selected=true;
					count++;
				}
			}
		}

		// disable 'export' and 'delete' buttons if no tiddlers selected
		this.$('exportStart').disabled=(count==0);
		this.$('exportDelete').disabled=(count==0);

		// show selection count
		var tiddlers = store.getTiddlers('title');
		if (theList.options.length) this.displayStatus(count,tiddlers.length);

		// if a [command] item, reload list... otherwise, no further refresh needed
		if (selectedIndex>4) return;

		// clear current list contents
		while (theList.length > 0) { theList.options[0] = null; }
		// add heading and control items to list
		var i=0;
		var indent=String.fromCharCode(160)+String.fromCharCode(160);
		theList.options[i++]=
			new Option(tiddlers.length+' tiddlers in document', '',false,false);
		theList.options[i++]=
			new Option(((sort=='title'   )?'>':indent)+' [by title]', '',false,false);
		theList.options[i++]=
			new Option(((sort=='modified')?'>':indent)+' [by date]', '',false,false);
		theList.options[i++]=
			new Option(((sort=='modifier')?'>':indent)+' [by author]', '',false,false);
		theList.options[i++]=
			new Option(((sort=='tags'    )?'>':indent)+' [by tags]', '',false,false);

		// output the tiddler list
		switch(sort) {
			case 'title':
				for(var t = 0; t < tiddlers.length; t++)
					theList.options[i++] = new Option(tiddlers[t].title,tiddlers[t].title,false,false);
				break;
			case 'modifier':
			case 'modified':
				var tiddlers = store.getTiddlers(sort);
				// sort descending for newest date first
				tiddlers.sort(function (a,b) {if(a[sort] == b[sort]) return(0); else return (a[sort] > b[sort]) ? -1 : +1; });
				var lastSection = '';
				for(var t = 0; t < tiddlers.length; t++) {
					var tiddler = tiddlers[t];
					var theSection = '';
					if (sort=='modified') theSection=tiddler.modified.toLocaleDateString();
					if (sort=='modifier') theSection=tiddler.modifier;
					if (theSection != lastSection) {
						theList.options[i++] = new Option(theSection,'',false,false);
						lastSection = theSection;
					}
					theList.options[i++] = new Option(indent+indent+tiddler.title,tiddler.title,false,false);
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
					theList.options[i++]=new Option(theTag,'',false,false);
					for(var t=0; t<theTitles[theTag].length; t++)
						theList.options[i++]=new Option(indent+indent+theTitles[theTag][t],theTitles[theTag][t],false,false);
				}
				break;
			}
		theList.selectedIndex=selectedIndex; // select current control item
		this.$('exportStart').disabled=true;
		this.$('exportDelete').disabled=true;
		this.displayStatus(0,tiddlers.length);
	},
	askForFilename: function(here) {
		var msg=here.title; // use tooltip as dialog box message
		var path=getLocalPath(document.location.href);
		var slashpos=path.lastIndexOf('/'); if (slashpos==-1) slashpos=path.lastIndexOf('\\'); 
		if (slashpos!=-1) path = path.substr(0,slashpos+1); // remove filename from path, leave the trailing slash
		var filetype=this.$('exportFormat').value.toLowerCase();
		var defext='html';
		if (filetype==this.type_TX) defext='txt';
		if (filetype==this.type_CS) defext='csv';
		if (filetype==this.type_NF) defext='xml';
		var file=this.newdefault.replace(/html$/,defext);
		var result='';
		if(window.Components) { // moz
			try {
				netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
				var nsIFilePicker = window.Components.interfaces.nsIFilePicker;
				var picker = Components.classes['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
				picker.init(window, msg, nsIFilePicker.modeSave);
				var thispath = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				thispath.initWithPath(path);
				picker.displayDirectory=thispath;
				picker.defaultExtension=defext;
				picker.defaultString=file;
				picker.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterText|nsIFilePicker.filterHTML);
				if (picker.show()!=nsIFilePicker.returnCancel) var result=picker.file.path;
			}
			catch(e) { alert('error during local file access: '+e.toString()) }
		}
		else { // IE
			try { // XPSP2 IE only
				var s = new ActiveXObject('UserAccounts.CommonDialog');
				s.Filter='All files|*.*|Text files|*.txt|HTML files|*.htm;*.html|XML files|*.xml|';
				s.FilterIndex=defext=='txt'?2:'html'?3:'xml'?4:1;
				s.InitialDir=path;
				s.FileName=file;
				if (s.showOpen()) var result=s.FileName;
			}
			catch(e) {  // fallback
				var result=prompt(msg,path+file);
			}
		}
		return result;
	},
	initFilter: function() {
		this.$('exportFilterStart').checked=false; this.$('exportStartDate').value='';
		this.$('exportFilterEnd').checked=false;  this.$('exportEndDate').value='';
		this.$('exportFilterTags').checked=false; this.$('exportTags').value='';
		this.$('exportFilterText').checked=false; this.$('exportText').value='';
		this.showFilterFields();
	},
	showFilterFields: function(which) {
		var show=this.$('exportFilterStart').checked;
		this.$('exportFilterStartBy').style.display=show?'block':'none';
		this.$('exportStartDate').style.display=show?'block':'none';
		var val=this.$('exportFilterStartBy').value;
		this.$('exportStartDate').value
			=this.getFilterDate(val,'exportStartDate').formatString(this.datetimefmt);
		if (which && (which.id=='exportFilterStartBy') && (val=='other'))
			this.$('exportStartDate').focus();

		var show=this.$('exportFilterEnd').checked;
		this.$('exportFilterEndBy').style.display=show?'block':'none';
		this.$('exportEndDate').style.display=show?'block':'none';
		var val=this.$('exportFilterEndBy').value;
		this.$('exportEndDate').value
			=this.getFilterDate(val,'exportEndDate').formatString(this.datetimefmt);
		 if (which && (which.id=='exportFilterEndBy') && (val=='other'))
			this.$('exportEndDate').focus();

		var show=this.$('exportFilterTags').checked;
		this.$('exportTags').style.display=show?'block':'none';

		var show=this.$('exportFilterText').checked;
		this.$('exportText').style.display=show?'block':'none';
	},
	getFilterDate: function(val,id) {
		var result=0;
		switch (val) {
			case 'file':
				result=new Date(document.lastModified);
				break;
			case 'other':
				result=new Date(this.$(id).value);
				break;
			default: // today=0, yesterday=1, one week=7, two weeks=14, a month=31
				var now=new Date(); var tz=now.getTimezoneOffset()*60000; now-=tz;
				var oneday=86400000;
				if (id=='exportStartDate')
					result=new Date((Math.floor(now/oneday)-val)*oneday+tz);
				else
					result=new Date((Math.floor(now/oneday)-val+1)*oneday+tz-1);
				break;
		}
		return result;
	},
	filterExportList: function() {
		var theList  = this.$('exportList'); if (!theList) return -1;
		var filterStart=this.$('exportFilterStart').checked;
		var val=this.$('exportFilterStartBy').value;
		var startDate=config.macros.exportTiddlers.getFilterDate(val,'exportStartDate');
		var filterEnd=this.$('exportFilterEnd').checked;
		var val=this.$('exportFilterEndBy').value;
		var endDate=config.macros.exportTiddlers.getFilterDate(val,'exportEndDate');
		var filterTags=this.$('exportFilterTags').checked;
		var tags=this.$('exportTags').value;
		var filterText=this.$('exportFilterText').checked;
		var text=this.$('exportText').value;
		if (!(filterStart||filterEnd||filterTags||filterText)) {
			alert('Please set the selection filter');
			this.$('exportFilterPanel').style.display='block';
			return -1;
		}
		if (filterStart&&filterEnd&&(startDate>endDate)) {
			var msg='starting date/time:\n'
			msg+=startDate.toLocaleString()+'\n';
			msg+='is later than ending date/time:\n'
			msg+=endDate.toLocaleString()
			alert(msg);
			return -1;
		}
		// if filter by tags, get list of matching tiddlers
		// use getMatchingTiddlers() (if MatchTagsPlugin is installed) for full boolean expressions
		// otherwise use getTaggedTiddlers() for simple tag matching
		if (filterTags) {
			var fn=store.getMatchingTiddlers||store.getTaggedTiddlers;
			var t=fn.apply(store,[tags]);
			var tagged=[];
			for (var i=0; i<t.length; i++) tagged.push(t[i].title);
		}
		// scan list and select tiddlers that match all applicable criteria
		var total=0;
		var count=0;
		for (var i=0; i<theList.options.length; i++) {
			// get item, skip non-tiddler list items (section headings)
			var opt=theList.options[i]; if (opt.value=='') continue;
			// get tiddler, skip missing tiddlers (this should NOT happen)
			var tiddler=store.getTiddler(opt.value); if (!tiddler) continue; 
			var sel=true;
			if ( (filterStart && tiddler.modified<startDate)
			|| (filterEnd && tiddler.modified>endDate)
			|| (filterTags && !tagged.contains(tiddler.title))
			|| (filterText && (tiddler.text.indexOf(text)==-1) && (tiddler.title.indexOf(text)==-1)))
				sel=false;
			opt.selected=sel;
			count+=sel?1:0;
			total++;
		}
		return count;
	},
	deleteTiddlers: function() {
		var list=this.$('exportList'); if (!list) return;
		var tids=[];
		for (i=0;i<list.length;i++)
			if (list.options[i].selected && list.options[i].value.length)
				tids.push(list.options[i].value);
		if (!confirm('Are you sure you want to delete these tiddlers:\n\n'+tids.join(', '))) return;
		store.suspendNotifications();
		for (t=0;t<tids.length;t++) {
			var tid=store.getTiddler(tids[t]); if (!tid) continue;
			var msg="'"+tid.title+"' is tagged with 'systemConfig'.\n\n";
			msg+='Removing this tiddler may cause unexpected results.  Are you sure?'
			if (tid.tags.contains('systemConfig') && !confirm(msg)) continue;
			store.removeTiddler(tid.title);
			story.closeTiddler(tid.title);
		}
		store.resumeNotifications();
		alert(tids.length+' tiddlers deleted');
		this.refreshList(0); // reload listbox
		store.notifyAll(); // update page display
	},
	go: function() {
		if (window.location.protocol!='file:') // make sure we are local
			{ displayMessage(config.messages.notFileUrlError); return; }
		// get selected tidders, target filename, target type, and notes
		var list=this.$('exportList'); if (!list) return;
		var tids=[]; for (var i=0; i<list.options.length; i++) {
			var opt=list.options[i]; if (!opt.selected||!opt.value.length) continue;
			var tid=store.getTiddler(opt.value); if (!tid) continue;
			tids.push(tid);
		}
		if (!tids.length) return; // no tiddlers selected
		var target=this.$('exportFilename').value.trim();
		if (!target.length) {
			displayMessage('A local target path/filename is required',target);
			return;
		}
		var merge=this.$('exportMerge').checked;
		var filetype=this.$('exportFormat').value.toLowerCase();
		var notes=this.$('exportNotes').value.replace(/\n/g,'<br>');
		var total={val:0};
		var out=this.assembleFile(target,filetype,tids,notes,total,merge);
		if (!total.val) return; // cancelled file overwrite
		var link='file:///'+target.replace(/\\/g,'/');
		var samefile=link==decodeURIComponent(window.location.href);
		var p=getLocalPath(document.location.href);
		if (samefile) {
			if (config.options.chkSaveBackups) { var t=loadOriginal(p);if(t)saveBackup(p,t); }
			if (config.options.chkGenerateAnRssFeed && saveRss instanceof Function) saveRss(p);
		}
		var ok=saveFile(target,out);
		displayMessage((ok?this.okmsg:this.failmsg).format([total.val,total.val!=1?'s':'',target]),link);
	},
	plainTextHeader:
		 'Source:\n\t%0\n'
		+'Title:\n\t%1\n'
		+'Subtitle:\n\t%2\n'
		+'Created:\n\t%3 by %4\n'
		+'Application:\n\tTiddlyWiki %5 / %6 %7\n\n',
	plainTextTiddler:
		'- - - - - - - - - - - - - - -\n'
		+'|     title: %0\n'
		+'|   created: %1\n'
		+'|  modified: %2\n'
		+'| edited by: %3\n'
		+'|      tags: %4\n'
		+'- - - - - - - - - - - - - - -\n'
		+'%5\n',
	plainTextFooter:
		'',
	newsFeedHeader:
		 '<'+'?xml version="1.0"?'+'>\n'
		+'<rss version="2.0">\n'
		+'<channel>\n'
		+'<title>%1</title>\n'
		+'<link>%0</link>\n'
		+'<description>%2</description>\n'
		+'<language>en-us</language>\n'
		+'<copyright>Copyright '+(new Date().getFullYear())+' %4</copyright>\n'
		+'<pubDate>%3</pubDate>\n'
		+'<lastBuildDate>%3</lastBuildDate>\n'
		+'<docs>http://blogs.law.harvard.edu/tech/rss</docs>\n'
		+'<generator>TiddlyWiki %5 / %6 %7</generator>\n',
	newsFeedTiddler:
		'\n%0\n',
	newsFeedFooter:
		'</channel></rss>',
	pureStoreHeader:
		 '<html><body>'
		+'<style type="text/css">'
		+'	#storeArea {display:block;margin:1em;}'
		+'	#storeArea div {padding:0.5em;margin:1em;border:2px solid black;height:10em;overflow:auto;}'
		+'	#pureStoreHeading {width:100%;text-align:left;background-color:#eeeeee;padding:1em;}'
		+'</style>'
		+'<div id="pureStoreHeading">'
		+'	TiddlyWiki "PureStore" export file<br>'
		+'	Source'+': <b>%0</b><br>'
		+'	Title: <b>%1</b><br>'
		+'	Subtitle: <b>%2</b><br>'
		+'	Created: <b>%3</b> by <b>%4</b><br>'
		+'	TiddlyWiki %5 / %6 %7<br>'
		+'	Notes:<hr><pre>%8</pre>'
		+'</div>'
		+'<div id="storeArea">',
	pureStoreTiddler:
		'%0\n%1',
	pureStoreFooter:
		'</div><!--POST-BODY-START-->\n<!--POST-BODY-END--></body></html>',
	assembleFile: function(target,filetype,tids,notes,total,merge) {
		var revised='';
		var now = new Date().toLocaleString();
		var src=convertUnicodeToUTF8(document.location.href);
		var title = convertUnicodeToUTF8(wikifyPlain('SiteTitle').htmlEncode());
		var subtitle = convertUnicodeToUTF8(wikifyPlain('SiteSubtitle').htmlEncode());
		var user = convertUnicodeToUTF8(config.options.txtUserName.htmlEncode());
		var twver = version.major+'.'+version.minor+'.'+version.revision;
		var v=version.extensions.ExportTiddlersPlugin; var pver = v.major+'.'+v.minor+'.'+v.revision;
		var headerargs=[src,title,subtitle,now,user,twver,'ExportTiddlersPlugin',pver,notes];
		switch (filetype) {
			case this.type_TX: // plain text
				var header=this.plainTextHeader.format(headerargs);
				var footer=this.plainTextFooter;
				break;
			case this.type_CS: // comma-separated
				var fields={};
				for (var i=0; i<tids.length; i++) for (var f in tids[i].fields) fields[f]=f;
				var names=['title','created','modified','modifier','tags','text'];
				for (var f in fields) names.push(f);
				var header=names.join(',')+'\n';
				var footer='';
				break;
			case this.type_NF: // news feed (XML)
				headerargs[0]=store.getTiddlerText('SiteUrl','');
				var header=this.newsFeedHeader.format(headerargs);
				var footer=this.newsFeedFooter;
				break;
			case this.type_PS: // PureStore (no code)
				var header=this.pureStoreHeader.format(headerargs);
				var footer=this.pureStoreFooter;
				break;
			case this.type_TW: // full TiddlyWiki
			default:
				var currPath=getLocalPath(window.location.href);
				var original=loadFile(currPath);
				if (!original) { displayMessage(config.messages.cantSaveError); return; }
				var posDiv = locateStoreArea(original);
				if (!posDiv) { displayMessage(config.messages.invalidFileError.format([currPath])); return; }
				var header = original.substr(0,posDiv[0]+startSaveArea.length)+'\n';
				var footer = '\n'+original.substr(posDiv[1]);
				break;
		}
		var out=this.getData(target,filetype,tids,fields,merge);
		var revised = header+convertUnicodeToUTF8(out.join('\n'))+footer;
		// if full TW, insert page title and language attr, and reset all MARKUP blocks...
		if (filetype==this.type_TW) {
			var newSiteTitle=convertUnicodeToUTF8(getPageTitle()).htmlEncode();
			revised=revised.replaceChunk('<title'+'>','</title'+'>',' ' + newSiteTitle + ' ');
			revised=updateLanguageAttribute(revised);
			var titles=[]; for (var i=0; i<tids.length; i++) titles.push(tids[i].title);
			revised=updateMarkupBlock(revised,'PRE-HEAD',
				titles.contains('MarkupPreHead')? 'MarkupPreHead' :null);
			revised=updateMarkupBlock(revised,'POST-HEAD',
				titles.contains('MarkupPostHead')?'MarkupPostHead':null);
			revised=updateMarkupBlock(revised,'PRE-BODY',
				titles.contains('MarkupPreBody')? 'MarkupPreBody' :null);
			revised=updateMarkupBlock(revised,'POST-SCRIPT',
				titles.contains('MarkupPostBody')?'MarkupPostBody':null);
		}
		total.val=out.length;
		return revised;
	},
	getData: function(target,filetype,tids,fields,merge) {
		// output selected tiddlers and gather list of titles (for use with merge)
		var out=[]; var titles=[];
		var url=store.getTiddlerText('SiteUrl','');
		for (var i=0; i<tids.length; i++) {
			out.push(this.formatItem(store,filetype,tids[i],url,fields));
			titles.push(tids[i].title);
		}
		// if TW or PureStore format, ask to merge with existing tiddlers (if any)
		if (filetype==this.type_TW || filetype==this.type_PS) {
			var txt=loadFile(target);
			if (txt && txt.length) {
				var remoteStore=new TiddlyWiki();
				if (version.major+version.minor*.1+version.revision*.01<2.52) txt=convertUTF8ToUnicode(txt);
				if (remoteStore.importTiddlyWiki(txt)) {
					var existing=remoteStore.getTiddlers('title');
					var msg=this.overwriteprompt.format([target,existing.length,existing.length!=1?'s':'']);
					if (merge) {
						var added=titles.length; var updated=0; var kept=0;
						for (var i=0; i<existing.length; i++)
							if (titles.contains(existing[i].title)) {
								added--; updated++;
							} else {
								out.push(this.formatItem(remoteStore,filetype,existing[i],url));
								kept++;
							}
						displayMessage(this.mergestatus.format(
							[added,added!=1?'s':'',updated,updated!=1?'s':'',kept,kept!=1?'s':'',]));
					}
					else if (!confirm(msg)) out=[]; // empty the list = don't write file
				}
			}
		}
		return out;
	},
	formatItem: function(s,f,t,u,fields) {
		if (f==this.type_TW)
			var r=s.getSaver().externalizeTiddler(s,t);
		if (f==this.type_PS)
			var r=this.pureStoreTiddler.format([t.title,s.getSaver().externalizeTiddler(s,t)]);
		if (f==this.type_NF)
			var r=this.newsFeedTiddler.format([t.saveToRss(u)]);
		if (f==this.type_TX)
			var r=this.plainTextTiddler.format([t.title, t.created.toLocaleString(), t.modified.toLocaleString(),
				t.modifier, String.encodeTiddlyLinkList(t.tags), t.text]);
		if (f==this.type_CS) {
			function toCSV(t) { return '"'+t.replace(/"/g,'""')+'"'; } // always encode CSV
			var out=[ toCSV(t.title), toCSV(t.created.toLocaleString()), toCSV(t.modified.toLocaleString()),
				toCSV(t.modifier), toCSV(String.encodeTiddlyLinkList(t.tags)), toCSV(t.text) ];
			for (var f in fields) out.push(toCSV(t.fields[f]||''));
			var r=out.join(',');
		}
		return r||"";
	}
}
//}}}
/***
!!!Control panel CSS
//{{{
!css
#exportPanel {
	display: none; position:absolute; z-index:12; width:35em; right:105%; top:6em;
	background-color: #eee; color:#000; font-size: 8pt; line-height:110%;
	border:1px solid black; border-bottom-width: 3px; border-right-width: 3px;
	padding: 0.5em; margin:0em; -moz-border-radius:1em;-webkit-border-radius:1em;
}
#exportPanel a, #exportPanel td a { color:#009; display:inline; margin:0px; padding:1px; }
#exportPanel table {
	width:100%; border:0px; padding:0px; margin:0px;
	font-size:8pt; line-height:110%; background:transparent;
}
#exportPanel tr { border:0px;padding:0px;margin:0px; background:transparent; }
#exportPanel td { color:#000; border:0px;padding:0px;margin:0px; background:transparent; }
#exportPanel select { width:98%;margin:0px;font-size:8pt;line-height:110%;}
#exportPanel input  { width:98%;padding:0px;margin:0px;font-size:8pt;line-height:110%; }
#exportPanel textarea  { width:98%;padding:0px;margin:0px;overflow:auto;font-size:8pt; }
#exportPanel .box {
	border:1px solid black; padding:3px; margin-bottom:5px;
	background:#f8f8f8; -moz-border-radius:5px;-webkit-border-radius:5px; }
#exportPanel .topline { border-top:2px solid black; padding-top:3px; margin-bottom:5px; }
#exportPanel .rad { width:auto;border:0 }
#exportPanel .chk { width:auto;border:0 }
#exportPanel .btn { width:auto; }
#exportPanel .btn1 { width:98%; }
#exportPanel .btn2 { width:48%; }
#exportPanel .btn3 { width:32%; }
#exportPanel .btn4 { width:24%; }
#exportPanel .btn5 { width:19%; }
!end
//}}}
!!!Control panel HTML
//{{{
!html
<!-- target path/file  -->
<div>
<div style="float:right;padding-right:.5em">
<input type="checkbox" style="width:auto" id="exportMerge" CHECKED
	title="combine selected tiddlers with existing tiddlers (if any) in export file"> merge
</div>
export to:<br>
<input type="text" id="exportFilename" size=40 style="width:93%"><input 
	type="button" id="exportBrowse" value="..." title="select or enter a local folder/file..." style="width:5%" 
	onclick="var fn=config.macros.exportTiddlers.askForFilename(this); if (fn.length) this.previousSibling.value=fn; ">
</div>

<!-- output format -->
<div>
format:
<select id="exportFormat" size=1>
	<option value="TW">TiddlyWiki HTML document (includes core code)</option>
	<option value="PS">TiddlyWiki "PureStore" HTML file (tiddler data only)</option>
	<option value="TX">TiddlyWiki plain text TXT file (tiddler source listing)</option>
	<option value="CS">Comma-Separated Value (CSV) data file</option>
	<option value="NF">RSS NewsFeed XML file</option>
</select>
</div>

<!-- notes -->
<div>
notes:<br>
<textarea id="exportNotes" rows=3 cols=40 style="height:4em;margin-bottom:5px;" onfocus="this.select()"></textarea> 
</div>

<!-- list of tiddlers -->
<table><tr align="left"><td>
	select:
	<a href="JavaScript:;" id="exportSelectAll"
		onclick="return config.macros.exportTiddlers.process(this)" title="select all tiddlers">
		&nbsp;all&nbsp;</a>
	<a href="JavaScript:;" id="exportSelectChanges"
		onclick="return config.macros.exportTiddlers.process(this)" title="select tiddlers changed since last save">
		&nbsp;changes&nbsp;</a>
	<a href="JavaScript:;" id="exportSelectOpened"
		onclick="return config.macros.exportTiddlers.process(this)" title="select tiddlers currently being displayed">
		&nbsp;opened&nbsp;</a>
	<a href="JavaScript:;" id="exportSelectRelated"
		onclick="return config.macros.exportTiddlers.process(this)" title="select tiddlers related to the currently selected tiddlers">
		&nbsp;related&nbsp;</a>
	<a href="JavaScript:;" id="exportToggleFilter"
		onclick="return config.macros.exportTiddlers.process(this)" title="show/hide selection filter">
		&nbsp;filter&nbsp;</a>
</td><td align="right">
	<a href="JavaScript:;" id="exportListSmaller"
		onclick="return config.macros.exportTiddlers.process(this)" title="reduce list size">
		&nbsp;&#150;&nbsp;</a>
	<a href="JavaScript:;" id="exportListLarger"
		onclick="return config.macros.exportTiddlers.process(this)" title="increase list size">
		&nbsp;+&nbsp;</a>
</td></tr></table>
<select id="exportList" multiple size="10" style="margin-bottom:5px;"
	onchange="config.macros.exportTiddlers.refreshList(this.selectedIndex)">
</select><br>

<!-- selection filter -->
<div id="exportFilterPanel" style="display:none">
<table><tr align="left"><td>
	selection filter
</td><td align="right">
	<a href="JavaScript:;" id="exportHideFilter"
		onclick="return config.macros.exportTiddlers.process(this)" title="hide selection filter">hide</a>
</td></tr></table>
<div class="box">

<input type="checkbox" class="chk" id="exportFilterStart" value="1"
	onclick="config.macros.exportTiddlers.showFilterFields(this)"> starting date/time<br>
<table cellpadding="0" cellspacing="0"><tr valign="center"><td width="50%">
	<select size=1 id="exportFilterStartBy"
		onchange="config.macros.exportTiddlers.showFilterFields(this);">
		<option value="0">today</option>
		<option value="1">yesterday</option>
		<option value="7">a week ago</option>
		<option value="30">a month ago</option>
		<option value="file">file date</option>
		<option value="other">other (mm/dd/yyyy hh:mm)</option>
	</select>
</td><td width="50%">
	<input type="text" id="exportStartDate" onfocus="this.select()"
		onchange="config.macros.exportTiddlers.$('exportFilterStartBy').value='other';">
</td></tr></table>

<input type="checkbox" class="chk" id="exportFilterEnd" value="1"
	onclick="config.macros.exportTiddlers.showFilterFields(this)"> ending date/time<br>
<table cellpadding="0" cellspacing="0"><tr valign="center"><td width="50%">
	<select size=1 id="exportFilterEndBy"
		onchange="config.macros.exportTiddlers.showFilterFields(this);">
		<option value="0">today</option>
		<option value="1">yesterday</option>
		<option value="7">a week ago</option>
		<option value="30">a month ago</option>
		<option value="file">file date</option>
		<option value="other">other (mm/dd/yyyy hh:mm)</option>
	</select>
</td><td width="50%">
	<input type="text" id="exportEndDate" onfocus="this.select()"
		onchange="config.macros.exportTiddlers.$('exportFilterEndBy').value='other';">
</td></tr></table>

<input type="checkbox" class="chk" id=exportFilterTags value="1"
	onclick="config.macros.exportTiddlers.showFilterFields(this)"> match tags<br>
<input type="text" id="exportTags" onfocus="this.select()">

<input type="checkbox" class="chk" id=exportFilterText value="1"
	onclick="config.macros.exportTiddlers.showFilterFields(this)"> match titles/tiddler text<br>
<input type="text" id="exportText" onfocus="this.select()">

</div> <!--box-->
</div> <!--panel-->

<!-- action buttons -->
<div style="text-align:center">
<input type=button class="btn4" onclick="config.macros.exportTiddlers.process(this)"
	id="exportFilter" value="apply filter">
<input type=button class="btn4" onclick="config.macros.exportTiddlers.process(this)"
	id="exportStart" value="export tiddlers">
<input type=button class="btn4" onclick="config.macros.exportTiddlers.process(this)"
	id="exportDelete" value="delete tiddlers">
<input type=button class="btn4" onclick="config.macros.exportTiddlers.process(this)"
	id="exportClose" value="close">
</div><!--center-->
!end
//}}}
***/
 