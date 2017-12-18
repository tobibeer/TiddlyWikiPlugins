/%
!info
|Name|LoadRemotePlugin|
|Source|http://www.TiddlyTools.com/#LoadRemotePlugin|
|Version|2.0.2|
|Author|Eric Shulman|
|License|http://www.TiddlyTools.com/#LegalStatements|
|~CoreVersion|2.1|
|Type|transclusion|
|Description|Load a plugin from a remote .js URL|
Usage
<<<
{{{
<<tiddler LoadRemotePlugin with: "label" "tip" "URL"
	"onloadfunction" "preloadedtest" "onrunfunction" "configoverlay">>
}}}
*''label'' and ''tip''<br>command link text and tooltip
*''URL''<br>location of .js (i.e., the remotely stored plugin file)
*''onloadfunction''<br>js code invoked after loading remote plugin (can be used to init values, display tiddlers, etc)
*''preloadedtest''<br>js expression evaluated to test if plugin has already been loaded
*''onrunfunction''<br>js code invoked //instead of onloadfunction// when plugin is already loaded
*''configoverlay''<br>name of tiddler containing js code with additional custom settings, tweaks, etc.
<<<
Examples
<<<
{{{
<<tiddler LoadRemotePlugin##show with:
	[[ImportTiddlersPlugin]]
	[[Load ImportTiddlersPlugin from svn.TiddlyWiki.org repository]]
	[[http://svn.tiddlywiki.org/Trunk/contributors/EricShulman/plugins/ImportTiddlersPlugin.js]]
	[[window.story.displayTiddler(null,'ImportTiddlers')]]
	[[version.extensions.ImportTiddlersPlugin!=undefined]]
	[[window.story.displayTiddler(null,'ImportTiddlers')]]
	[[ImportTiddlersPluginConfig]]
>>
}}}
<<tiddler LoadRemotePlugin##Examples>>
<<<
!end

!Examples
*[[TiddlyTools|http://www.TiddlyTools.com/]]
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[ImportTiddlersPlugin]]
	[[Load ImportTiddlersPlugin from svn.TiddlyWiki.org repository]]
	[[http://svn.tiddlywiki.org/Trunk/contributors/EricShulman/plugins/ImportTiddlersPlugin.js]]
	[[window.story.displayTiddler(null,'ImportTiddlers')]]
	[[version.extensions.ImportTiddlersPlugin!=undefined]]
	[[window.story.displayTiddler(null,'ImportTiddlers')]]
	[[ImportTiddlersPluginConfig]]
>>}}}
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[TiddlerTweakerPlugin]]
	[[Load TiddlerTweakerPlugin from svn.TiddlyWiki.org repository]]
	[[http://svn.tiddlywiki.org/Trunk/contributors/EricShulman/plugins/TiddlerTweakerPlugin.js]]
	[[window.story.displayTiddler(null,'TiddlerTweaker')]]
	[[version.extensions.TiddlerTweakerPlugin!=undefined]]
>>}}}
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[RearrangeTiddlersPlugin]]
	[[Load RearrangeTiddlersPlugin from www.TiddlyTools.com]]
	[[http://www.TiddlyTools.com/plugins/RearrangeTiddlersPlugin.js]]
	[[window.story.forEachTiddler(function(t,e){window.story.refreshTiddler(t,null,true)}); window.refreshDisplay()]]
	[[Story.prototype.rearrangeTiddlersHijack_refreshTiddler!=undefined]]
>>}}}
*[[Abego Software|http://tiddlywiki.abego-software.de/]]
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[YourSearchPlugin]]
	[[Load YourSearchPlugin from tiddlywiki.abego-software.de]]
	[[http://tiddlywiki.abego-software.de/archive/YourSearchPlugin/Plugin-YourSearch-src.2.1.1.js]]
	[[window.refreshPageTemplate()]]
	[[version.extensions.YourSearchPlugin!=undefined]]
>>}}}
*[[FirefoxPrivileges.TiddlySpot.com|http://firefoxprivileges.tiddlyspot.com/]]
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[Firefox Privilege Manager]]
	[[Load Firefox Privilege Manager from svn.TiddlyWiki.org repository]]
	[[http://svn.tiddlywiki.org/Trunk/contributors/XavierVerges/plugins/FirefoxPrivilegesPlugin.js]]
	[[config.macros.firefoxPrivileges.onload()]]
	[[config.macros.firefoxPrivileges!=undefined]]
	[[backstage.switchTab('firefoxPrivileges')]]
>>}}}
*[[BillyReisinger.com:|http://www.billyreisinger.com/jash/]]
**{{block{<<tiddler LoadRemotePlugin##show with:
	[[Jash (JAvascript SHell)]]
	[[Load Jash (JAvascript SHell) from www.billyreisinger.com/jash]]
	[[http://www.billyreisinger.com/jash/source/latest/Jash.js]]
	[[window.jash.close()]]
	[[window.jash!=undefined]]
>>}}}
!end

!show
<html><nowiki><a href="javascript:;" title="$2"
onmouseover="
	this.href='javascript:void(eval(decodeURIComponent(%22(function(){try{('
	+encodeURIComponent(encodeURIComponent(this.onclick))
	+')()}catch(e){alert(e.description?e.description:e.toString())}})()%22)))';"
onclick="
	try { if ($5) {
		clearMessage();
		try {$6;} catch(e) {$4;}
		displayMessage('$1 is already installed.');
		return false;
	} } catch(e){;}
	var s=document.createElement('script');
	s.src='$3';
	s.onerror=function() {
		clearMessage();
		displayMessage('Could not load $1 from');
		displayMessage(this.src,this.src);
	};
	s.onload=function() { 
		clearMessage();
		{$4;}
		try { eval(store.getTiddlerText('$7','')); }
		catch(e) { displayMessage(e.description||e.toString()); }
		displayMessage('$1 has been loaded from');
		displayMessage(this.src,this.src);
	};
	s.onreadystatechange=function()  /* for IE */
		{ if(this.readyState=='complete') this.onload(); };
	document.getElementsByTagName('head')[0].appendChild(s);
	return false;
">$1</a></html>
!end
%/<<tiddler {{var src='LoadRemotePlugin';src+(tiddler&&tiddler.title==src?'##info':'##show');}}
	with: [[$1]] [[$2]] [[$3]] [[$4]] [[$5]] [[$6]] [[$7]]>>