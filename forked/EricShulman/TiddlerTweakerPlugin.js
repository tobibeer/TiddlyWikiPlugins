/***
|Name|TiddlerTweakerPlugin|
|Source|http://www.TiddlyTools.com/#TiddlerTweakerPlugin|
|Version|2.4.5|
|Author|Eric Shulman|
|License|http://www.TiddlyTools.com/#LegalStatements|
|~CoreVersion|2.1|
|Type|plugin|
|Description|select multiple tiddlers and modify author, created, modified and/or tag values|
~TiddlerTweaker is a 'power tool' for TiddlyWiki authors.  Select multiple tiddlers from a listbox and 'bulk modify' the creator, author, created, modified and/or tag values of those tiddlers using a compact set of form fields.  The values you enter into the fields simultaneously overwrite the existing values in all tiddlers you have selected.
!!!!!Usage
<<<
{{{<<tiddlerTweaker>>}}}
{{smallform{<<tiddlerTweaker>>}}}
By default, any tags you enter into the TiddlerTweaker will //replace// the existing tags in all the tiddlers you have selected.  However, you can also use TiddlerTweaker to quickly filter specified tags from the selected tiddlers, while leaving any other tags assigned to those tiddlers unchanged:
>Any tag preceded by a '+' (plus) or '-' (minus), will be added or removed from the existing tags //instead of replacing the entire tag definition// of each tiddler (e.g., enter '-excludeLists' to remove that tag from all selected tiddlers.  When using this syntax, care should be taken to ensure that //every// tag is preceded by '+' or '-', to avoid inadvertently overwriting any other existing tags on the selected tiddlers.  (note: the '+' or '-' prefix on each tag value is NOT part of the tag value, and is only used by TiddlerTweaker to control how that tag value is processed)
Important Notes:
* TiddlerTweaker is a 'power user' tool that can make changes to many tiddlers at once.  ''You should always have a recent backup of your document (or 'save changes' just *before* tweaking the tiddlers), just in case you accidentally 'shoot yourself in the foot'.''
* The date and author information on any tiddlers you tweak will ONLY be updated if the corresponding checkboxes have been selected.  As a general rule, after using TiddlerTweaker, always ''//remember to save your document//'' when you are done, even though the tiddler timeline tab may not show any recently modified tiddlers.
* Selecting and updating all tiddlers in a document can take a while.  Your browser may warn about an 'unresponsive script'.  Usually, if you allow it to continue, it should complete the processing... eventually.  Nonetheless, be sure to save your work before you begin tweaking lots of tiddlers, just in case something does get stuck.
<<<
!!!!!Revisions
<<<
2011.01.21 2.4.5 auto-selection: use "-" for untagged tiddlers.  Also, added 'opened', 'invert'
2009.09.15 2.4.4 added 'edit' button. moved html definition to separate section
2009.09.13 2.4.3 in settiddlers(), convert backslashed chars (\n\b\s\t) in replacement text
2009.06.26 2.4.2 only add brackets around tags containing spaces
2009.06.22 2.4.1 in setFields(), add brackets around all tags shown tweaker edit field
2009.03.30 2.4.0 added 'sort by modifier'
2009.01.22 2.3.0 added support for text pattern find/replace
2008.10.27 2.2.3 in setTiddlers(), fixed Safari bug by replacing static Array.concat(...) with new Array().concat(...)
2008.09.07 2.2.2 added removeCookie() function for compatibility with [[CookieManagerPlugin]]
2008.05.12 2.2.1 replace built-in backstage tweak task with tiddler tweaker control panel (moved from BackstageTweaks)
2008.01.13 2.2.0 added 'auto-selection' links: all, changed, tags, title, text
2007.12.26 2.1.0 added support for managing 'creator' custom field (see [[CoreTweaks]])
2007.11.01 2.0.3 added config.options.txtTweakerSortBy for cookie-based persistence of list display order preference setting.
2007.09.28 2.0.2 in settiddlers() and deltiddlers(), added suspend/resume notification handling (improves performance when operating on multiple tiddlers)
2007.08.03 2.0.1 added shadow definition for [[TiddlerTweaker]] tiddler for use as parameter references with {{{<<tiddler>>, <<slider>> or <<tabs>>}}} macros.
2007.08.03 2.0.0 converted from inline script
2006.01.01 1.0.0 initial release
<<<
!!!!!Code
***/
//{{{
version.extensions.TiddlerTweakerPlugin= {major: 2, minor: 4, revision: 5, date: new Date(2011,1,21)};

// shadow tiddler
config.shadowTiddlers.TiddlerTweaker='<<tiddlerTweaker>>';

// defaults
if (config.options.txtTweakerSortBy==undefined) config.options.txtTweakerSortBy='modified';

// backstage task
if (config.tasks) { // for TW2.2b3 or above
	config.tasks.tweak.tooltip='review/modify tiddler internals: dates, authors, tags, etc.';
	config.tasks.tweak.content='{{smallform small groupbox{<<tiddlerTweaker>>}}}';
}

// if removeCookie() function is not defined by TW core, define it here.
if (window.removeCookie===undefined) {
	window.removeCookie=function(name) {
		document.cookie = name+'=; expires=Thu, 01-Jan-1970 00:00:01 UTC; path=/;'; 
	}
}

config.macros.tiddlerTweaker = {
	handler: function(place,macroName,params,wikifier,paramString,tiddler) {
		var span=createTiddlyElement(place,'span');
		span.innerHTML=store.getTiddlerText('TiddlerTweakerPlugin##html');
		this.init(span.getElementsByTagName('form')[0],config.options.txtTweakerSortBy);
	},
	init: function(f,sortby) { // set form controls
		if (!f) return; // form might not be rendered yet...
		while (f.list.options[0]) f.list.options[0]=null; // empty the list
		var tids=store.getTiddlers(sortby);
		if (sortby=='size') // descending order
			tids.sort(function(a,b) {return a.text.length > b.text.length ? -1 : (a.text.length == b.text.length ? 0 : +1);});
		var who='';
		for (i=0; i<tids.length; i++) { var t=tids[i];
			var label=t.title; var value=t.title;
			switch (sortby) {
				case 'modified':
				case 'created':
					var t=tids[tids.length-i-1]; // reverse order
					var when=t[sortby].formatString('YY.0MM.0DD 0hh:0mm ');
					label=when+t.title;
					value=t.title;
					break;
				case 'size':
					label='['+t.text.length+'] '+label;
					break;
				case 'modifier':
				case 'creator':
					if (who!=t[sortby]) {
						who=t[sortby];
						f.list.options[f.list.length]=new Option('by '+who+':','',false,false);
					}
					label='\xa0\xa0\xa0'+label; // indent
					break;
			}
			f.list.options[f.list.length]=new Option(label,value,false,false);
		}
		f.title.value=f.who.value=f.creator.value=f.tags.value='';
		f.cm.value=f.cd.value=f.cy.value=f.ch.value=f.cn.value='';
		f.mm.value=f.md.value=f.my.value=f.mh.value=f.mn.value='';
		f.stats.disabled=f.set.disabled=f.del.disabled=f.edit.disabled=f.display.disabled=true;
		f.settitle.disabled=false;
		config.options.txtTweakerSortBy=sortby;
		f.sortby.value=sortby; // sync droplist
		if (sortby!='modified') saveOptionCookie('txtTweakerSortBy');
		else removeCookie('txtTweakerSortBy');
	},
	enablefields: function(here) { // enables/disables inputs based on #items selected
		var f=here.form; var list=f.list;
		var c=0; for (i=0;i<list.length;i++) if (list.options[i].selected) c++;
		if (c>1) f.title.disabled=true;
		if (c>1) f.settitle.checked=false;
		f.set.disabled=(c==0);
		f.del.disabled=(c==0);
		f.edit.disabled=(c==0);
		f.display.disabled=(c==0);
		f.settitle.disabled=(c>1);
		f.stats.disabled=(c==0);
		var msg=(c==0)?'select tiddlers':(c+' tiddler'+(c!=1?'s':'')+' selected');
		here.previousSibling.firstChild.firstChild.nextSibling.innerHTML=msg;
		if (c) clearMessage(); else displayMessage('no tiddlers selected');
	},
	setfields: function(here) { // set fields from first selected tiddler
		var f=here.form;
		if (!here.value.length) {
			f.title.value=f.who.value=f.creator.value=f.tags.value='';
			f.cm.value=f.cd.value=f.cy.value=f.ch.value=f.cn.value='';
			f.mm.value=f.md.value=f.my.value=f.mh.value=f.mn.value='';
			return;
		}
		var tid=store.getTiddler(here.value); if (!tid) return;
		f.title.value=tid.title;
		f.who.value=tid.modifier;
		f.creator.value=tid.fields['creator']||''; // custom field - might not exist
		f.tags.value=tid.tags.map(function(t){return String.encodeTiddlyLink(t)}).join(' ');
		var c=tid.created; var m=tid.modified;
		f.cm.value=c.getMonth()+1;
		f.cd.value=c.getDate();
		f.cy.value=c.getFullYear();
		f.ch.value=c.getHours();
		f.cn.value=c.getMinutes();
		f.mm.value=m.getMonth()+1;
		f.md.value=m.getDate();
		f.my.value=m.getFullYear();
		f.mh.value=m.getHours();
		f.mn.value=m.getMinutes();
	},
	selecttiddlers: function(here,callback) {
		var f=here; while (f&&f.nodeName.toLowerCase()!='form')f=f.parentNode;
		for (var t=f.list.options.length-1; t>=0; t--)
			f.list.options[t].selected=callback(f.list.options[t]);
		config.macros.tiddlerTweaker.enablefields(f.list);
		return false;
	},
	settiddlers: function(here) {
		var f=here.form; var list=f.list;
		var tids=[];
		for (i=0;i<list.length;i++) if (list.options[i].selected) tids.push(list.options[i].value);
		if (!tids.length) { alert('please select at least one tiddler'); return; }
		var cdate=new Date(f.cy.value,f.cm.value-1,f.cd.value,f.ch.value,f.cn.value);
		var mdate=new Date(f.my.value,f.mm.value-1,f.md.value,f.mh.value,f.mn.value);
		if (tids.length>1 && !confirm('Are you sure you want to update these tiddlers:\n\n'+tids.join(', '))) return;
		store.suspendNotifications();
		for (t=0;t<tids.length;t++) {
			var tid=store.getTiddler(tids[t]); if (!tid) continue;
			var title=!f.settitle.checked?tid.title:f.title.value;
			var who=!f.setwho.checked?tid.modifier:f.who.value;
			var text=tid.text;
			if (f.replacetext.checked) {
				var r=f.replacement.value.replace(/\\t/mg,'\t').unescapeLineBreaks();
				text=text.replace(new RegExp(f.pattern.value,'mg'),r);
			}				
			var tags=tid.tags;
			if (f.settags.checked) { 
				var intags=f.tags.value.readBracketedList();
				var addtags=[]; var deltags=[]; var reptags=[];
				for (i=0;i<intags.length;i++) {
					if (intags[i].substr(0,1)=='+')
						addtags.push(intags[i].substr(1));
					else if (intags[i].substr(0,1)=='-')
						deltags.push(intags[i].substr(1));
					else
						reptags.push(intags[i]);
				}
				if (reptags.length)
					tags=reptags;
				if (addtags.length)
					tags=new Array().concat(tags,addtags);
				if (deltags.length)
					for (i=0;i<deltags.length;i++)
						{ var pos=tags.indexOf(deltags[i]); if (pos!=-1) tags.splice(pos,1); }
			}
			if (!f.setcdate.checked) cdate=tid.created;
			if (!f.setmdate.checked) mdate=tid.modified;
			store.saveTiddler(tid.title,title,text,who,mdate,tags,tid.fields);
			if (f.setcreator.checked) store.setValue(tid.title,'creator',f.creator.value); // set creator
			if (f.setcdate.checked) tid.assign(null,null,null,null,null,cdate); // set create date
		}
		store.resumeNotifications();
		this.init(f,f.sortby.value);
	},
	displaytiddlers: function(here,edit) {
		var f=here.form; var list=f.list;
		var tids=[];
		for (i=0; i<list.length;i++) if (list.options[i].selected) tids.push(list.options[i].value);
		if (!tids.length) { alert('please select at least one tiddler'); return; }
		story.displayTiddlers(story.findContainingTiddler(f),tids,edit?DEFAULT_EDIT_TEMPLATE:null);
	},
	deltiddlers: function(here) {
		var f=here.form; var list=f.list;
		var tids=[];
		for (i=0;i<list.length;i++) if (list.options[i].selected) tids.push(list.options[i].value);
		if (!tids.length) { alert('please select at least one tiddler'); return; }
		if (!confirm('Are you sure you want to delete these tiddlers:\n\n'+tids.join(', '))) return;
		store.suspendNotifications();
		for (t=0;t<tids.length;t++) {
			var tid=store.getTiddler(tids[t]); if (!tid) continue;
			if (tid.tags.contains('systemConfig')) {
				var msg=tid.title+' is tagged with systemConfig.'
					+'\n\nRemoving this tiddler may cause unexpected results.  Are you sure?';
				if (!confirm(msg)) continue;
			}
			store.removeTiddler(tid.title);
			story.closeTiddler(tid.title);
		}
		store.resumeNotifications();
		this.init(f,f.sortby.value);
	},
	stats: function(here) {
		var f=here.form; var list=f.list; var tids=[]; var out=''; var tot=0;
		var target=f.nextSibling;
		for (i=0;i<list.length;i++) if (list.options[i].selected) tids.push(list.options[i].value);
		if (!tids.length) { alert('please select at least one tiddler'); return; }
		for (t=0;t<tids.length;t++) {
			var tid=store.getTiddler(tids[t]); if (!tid) continue;
			out+='[['+tid.title+']] '+tid.text.length+'\n'; tot+=tid.text.length;
		}
		var avg=tot/tids.length;
		out=tot+' bytes in '+tids.length+' selected tiddlers ('+avg+' bytes/tiddler)\n<<<\n'+out+'<<<\n';
		removeChildren(target);
		target.innerHTML="<hr><font size=-2><a href='javascript:;' style='float:right' "
			+"onclick='this.parentNode.parentNode.style.display=\"none\"'>close</a></font>";
		wikify(out,target);
		target.style.display='block';
	}
};
//}}}
/***
//{{{
!html
<style>
.tiddlerTweaker table,
.tiddlerTweaker table tr,
.tiddlerTweaker table td
	{ padding:0;margin:0;border:0;white-space:nowrap; }
</style><form class='tiddlerTweaker'><!--
--><table style="width:100%"><tr valign="top"><!--
--><td style="text-align:center;width:99%;"><!--
	--><font size=-2><div style="text-align:left;"><span style="float:right"><!--
	-->&nbsp; <a href="javascript:;" 
		title="select all tiddlers"
		onclick="return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
			return opt.value.length;
		});">all</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="select tiddlers currently displayed in the story column"
		onclick="return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
			return story.getTiddler(opt.value);
		});">opened</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="select tiddlers that are new/changed since the last file save"
		onclick="var lastmod=new Date(document.lastModified);
			return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
				var tid=store.getTiddler(opt.value);
				return tid&&tid.modified>lastmod;
			});
		">changed</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="select tiddlers with at least one matching tag"
		onclick="var t=prompt('Enter space-separated tags (match one or more).  Use \x22-\x22 to match untagged tiddlers');
			if (!t||!t.length) return false;
			var tags=t.readBracketedList();
			return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
				var tid=store.getTiddler(opt.value);
				return tid&&tags[0]=='-'?!tid.tags.length:tid.tags.containsAny(tags);
			});
		">tags</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="select tiddlers whose titles include matching text"
		onclick="var t=prompt('Enter a title (or portion of a title) to match');
			if (!t||!t.length) return false;
			return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
				return opt.value.indexOf(t)!=-1;
			});
		">titles</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="select tiddlers containing matching text"
		onclick="var t=prompt('Enter tiddler text (content) to match');
			if (!t||!t.length) return false;
			return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
				var tt=store.getTiddlerText(opt.value,'');
				return tt.indexOf(t)!=-1;
			});
		">text</a><!--
	-->&nbsp; <a href="javascript:;" 
		title="reverse selection of all list items"
		onclick="return config.macros.tiddlerTweaker.selecttiddlers(this,function(opt){
			return !opt.selected;
		});">invert</a><!--
	--></span><span>select tiddlers</span><!--
	--></div><!--
	--></font><select multiple name=list size="11" style="width:99.99%" 
		title="use click, shift-click and/or ctrl-click to select multiple tiddler titles" 
		onclick="config.macros.tiddlerTweaker.enablefields(this)" 
		onchange="config.macros.tiddlerTweaker.setfields(this)"><!--
	--></select><br><!--
	-->show<input type=text size=1 value="11" 
		onchange="this.form.list.size=this.value; this.form.list.multiple=(this.value>1);"><!--
	-->by<!--
	--><select name=sortby size=1 
		onchange="config.macros.tiddlerTweaker.init(this.form,this.value)"><!--
	--><option value="title">title</option><!--
	--><option value="size">size</option><!--
	--><option value="modified">modified</option><!--
	--><option value="created">created</option><!--
	--><option value="modifier">modifier</option><!--
	--></select><!--
	--><input type="button" value="refresh" 
		onclick="config.macros.tiddlerTweaker.init(this.form,this.form.sortby.value)"<!--
	--> <input type="button" name="stats" disabled value="totals..." 
		onclick="config.macros.tiddlerTweaker.stats(this)"><!--
--></td><td style="width:1%"><!--
	--><div style="text-align:left"><font size=-2>&nbsp;modify values</font></div><!--
	--><table style="width:100%;"><tr><!--
	--><td style="padding:1px"><!--
		--><input type=checkbox name=settitle unchecked 
			title="allow changes to tiddler title (rename tiddler)" 
			onclick="this.form.title.disabled=!this.checked">title<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=title size=35 style="width:98%" disabled><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=setcreator unchecked 
			title="allow changes to tiddler creator" 
			onclick="this.form.creator.disabled=!this.checked">created by<!--
	--></td><td style="padding:1px;"><!--
		--><input type=text name=creator size=35 style="width:98%" disabled><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=setwho unchecked 
			title="allow changes to tiddler author" 
			onclick="this.form.who.disabled=!this.checked">modified by<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=who size=35 style="width:98%" disabled><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=setcdate unchecked 
			title="allow changes to created date" 
			onclick="var f=this.form;
				f.cm.disabled=f.cd.disabled=f.cy.disabled=f.ch.disabled=f.cn.disabled=!this.checked"><!--
		-->created on<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=cm size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> / <input type=text name=cd size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> / <input type=text name=cy size=4 style="width:3em;padding:0;text-align:center" disabled><!--
		--> at <input type=text name=ch size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> : <input type=text name=cn size=2 style="width:2em;padding:0;text-align:center" disabled><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=setmdate unchecked 
			title="allow changes to modified date" 
			onclick="var f=this.form;
				f.mm.disabled=f.md.disabled=f.my.disabled=f.mh.disabled=f.mn.disabled=!this.checked"><!--
		-->modified on<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=mm size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> / <input type=text name=md size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> / <input type=text name=my size=4 style="width:3em;padding:0;text-align:center" disabled><!--
		--> at <input type=text name=mh size=2 style="width:2em;padding:0;text-align:center" disabled><!--
		--> : <input type=text name=mn size=2 style="width:2em;padding:0;text-align:center" disabled><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=replacetext unchecked
			title="find/replace matching text" 
			onclick="this.form.pattern.disabled=this.form.replacement.disabled=!this.checked">replace text<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=pattern size=15 value="" style="width:40%" disabled 
			title="enter TEXT PATTERN (regular expression)"> with<!--
		--><input type=text name=replacement size=15 value="" style="width:40%" disabled 
			title="enter REPLACEMENT TEXT"><!--
	--></td></tr><tr><td style="padding:1px"><!--
		--><input type=checkbox name=settags checked 
			title="allow changes to tiddler tags" 
			onclick="this.form.tags.disabled=!this.checked">tags<!--
	--></td><td style="padding:1px"><!--
		--><input type=text name=tags size=35 value="" style="width:98%" 
			title="enter new tags or use '+tag' and '-tag' to add/remove tags from existing tags"><!--
	--></td></tr></table><!--
	--><div style="text-align:center"><!--
	--><nobr><input type=button name=display disabled style="width:24%" value="display" 
		title="show selected tiddlers"
		onclick="config.macros.tiddlerTweaker.displaytiddlers(this,false)"><!--
	--> <input type=button name=edit disabled style="width:23%" value="edit" 
		title="edit selected tiddlers"
		onclick="config.macros.tiddlerTweaker.displaytiddlers(this,true)"><!--
	--> <input type=button name=del disabled style="width:24%" value="delete" 
		title="remove selected tiddlers"
		onclick="config.macros.tiddlerTweaker.deltiddlers(this)"><!--
	--> <input type=button name=set disabled style="width:24%" value="update" 
		title="update selected tiddlers"
		onclick="config.macros.tiddlerTweaker.settiddlers(this)"></nobr><!--
	--></div><!--
--></td></tr></table><!--
--></form><span style="display:none"><!--content replaced by tiddler "stats"--></span>
!end
//}}}
***/
 