/***
|''Name:''|DefaultOnEmptyPlugin|
|''Description:''|opens the default tiddlers when the story is empty.|
|''Author:''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|0.1.0 (2015-01-22)|
|''~CoreVersion:''|2.5.2|
|''Documentation:''|http://defaultonempty.tiddlyspace.com|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/DefaultOnEmptyPlugin.min.js|
|''License''|Creative Commons 3.0|

!Code
***/
//{{{
(function(){var e=config.options;if(e["chkOpenDefaultOnEmpty"]===undefined){e["chkOpenDefaultOnEmpty"]=true}var t=Story.prototype;t.closeTiddlerDEFAULTONEMPTY=t.closeTiddler;t.closeTiddler=function(n,r,i){var s=n,o=e.chkOpenDefaultOnEmpty;if(o){var u=0;this.forEachTiddler(function(e){if(e!=s){u++}return u<2})}if(o&&u==0){r=false}t.closeTiddlerDEFAULTONEMPTY.apply(this,arguments);if(o&&u==0){story.displayTiddlers(null,store.getTiddlerText("DefaultTiddlers").readBracketedList())}}})()
//}}}