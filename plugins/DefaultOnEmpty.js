/***
|''Name:''|DefaultOnEmptyPlugin|
|''Description:''|opens the default tiddlers when the story is empty.|
|''Author:''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|0.1.0 (2015-01-22)|
|''~CoreVersion:''|2.5.2|
|''Documentation:''|http://defaultonempty.tiddlyspace.com|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/DefaultOnEmptyPlugin.js|
|''License''|Creative Commons 3.0|

!Code
***/
//{{{
(function(){

var co = config.options;

//doesn't exist?
if (co["chkOpenDefaultOnEmpty"] === undefined) {
    //initialize
    co["chkOpenDefaultOnEmpty"] = true;
}

//get story prototype
var sp = Story.prototype;

sp.closeTiddlerDEFAULTONEMPTY = sp.closeTiddler;
sp.closeTiddler = function(title,animate,unused) {
    var tiddler = title,
        open = co.chkOpenDefaultOnEmpty;

    //when single page mode enabled and there's no tiddler left
    if(open) {
        var t = 0;
        //find open tiddlers
        this.forEachTiddler(
            function(title) {
                if(title != tiddler) {
                    t++;
                }
                return t < 2;
            }
        );
    }
    //no animation when closing last
    if(open && t == 0) {
        animate = false;
    }
    //invoke core
    sp.closeTiddlerDEFAULTONEMPTY.apply(this,arguments);
    //none open
    if(open && t == 0) {
        //show defaults
        story.displayTiddlers(
            null,
            store.getTiddlerText("DefaultTiddlers").readBracketedList()
        );
    }
}

})();
//}}}