/***
|''Name''|NodeTreePlugin|
|''Description''|Extends TiddlyWiki list markup to add tree diagram type lists.|
|''Version''|0.5.7 (2013-09-22)|
|''Author''|G.J.Robert Ciang (江瑋平) / Tobias Beer|
|''Documentation''|http://nodetree.tiddlyspace.com|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/RobertCiang/NodeTreePlugin.js|
|''License''|CC BY-SA|
|''~CoreVersion''|2.1+|
|''Type''|plugin|
!Syntax
{{{
&&Root Node&&
%1st level child
%&&1st level parent&&
%%2nd level child
%%&&2st level parent&&
%%%3nd level child
?
/? creates a spacer
/ forward slash renders text w/o a node
%the end
}}}
!Code
***/
//{{{
(function($){

config.formatters.push(
{
	name: "NodeTree",
	match: "^(?:[\\*#;:%\\?/]+)",
	lookaheadRegExp: /^(?:(?:(\*)|(#)|(;)|(:)|(%)|(\?)|(\/))+)/mg,
	termRegExp: /(\n{1,2})/mg,
	handler: function(w)
	{
		var stack = [w.output];
		var currLevel = 0, currType = null;
		var listLevel, listType, itemType, baseType;
		w.nextMatch = w.matchStart;
		this.lookaheadRegExp.lastIndex = w.nextMatch;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		while(lookaheadMatch && lookaheadMatch.index == w.nextMatch) {
			if(lookaheadMatch[1]) {
				listType = "ul";
				itemType = "li";
			} else if(lookaheadMatch[2]) {
				listType = "ol";
				itemType = "li";
			} else if(lookaheadMatch[3]) {
				listType = "dl";
				itemType = "dt";
			} else if(lookaheadMatch[4]) {
				listType = "dl";
				itemType = "dd";
			} else if(lookaheadMatch[5]) {
				listType = "tl";
				itemType = "ti";
			} else if(lookaheadMatch[6]) {
				listType = "tl";
				itemType = "ts";
			} else if(lookaheadMatch[7]) {
				listType = "tl";
				itemType = "ts";
			}
			if(!baseType)
				baseType = listType;
			listLevel = lookaheadMatch[0].length;
			w.nextMatch += lookaheadMatch[0].length;
			var t;
			if(listLevel > currLevel) {
				for(t=currLevel; t<listLevel; t++) {
					var target = (currLevel == 0) ? stack[stack.length-1] : stack[stack.length-1].lastChild;
					stack.push(createTiddlyElement(target,'div',null,'nt-'+listType));
				}
			} else if(listType!=baseType && listLevel==1) {
				w.nextMatch -= lookaheadMatch[0].length;
				return;
			} else if(listLevel < currLevel) {
				for(t=currLevel; t>listLevel; t--)
					stack.pop();
			} else if(listLevel == currLevel && listType != currType) {
				stack.pop();
				stack.push(createTiddlyElement(stack[stack.length-1].lastChild,'div',null,'nt-'+listType));
			}
			currLevel = listLevel;
			currType = listType;
			var e = createTiddlyElement(stack[stack.length-1],'div',null,'nt-'+itemType);
			//fix for non-working :last-of-type
		   	if('ti' == itemType){
		   		$('> .nt-ti-last', $(e).parent() ).removeClass('nt-ti-last');
				$(e).addClass('nt-ti-last');
		    }
			w.subWikifyTerm(e,this.termRegExp);
			this.lookaheadRegExp.lastIndex = w.nextMatch;
			lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		}
	}
});

config.formatters.push(
{
	name: "NodeTreeParent",
	match: "&&",
	termRegExp: /(&&)/mg,
	element: "div",
	handler: function(w)
	{
		w.subWikifyTerm(createTiddlyElement(w.output,this.element,null,'nt-tp'),this.termRegExp);
	}
});

config.shadowTiddlers['NodeTreeImages'] =
    "!COMMON\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAQRJREFUeF7t0TENwDAQwMCH9vxJpYWQJZKHs3QIPLt7bv0NbxkSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMISlnPp2Sauq8hHx5AAAAAElFTkSuQmCC'"+
	"\n!FIRST\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAB9JREFUOE9jGAWjAAQcHBz+A/EhKJd0MGrA0DeAgQEAQ4caCSjqq+0AAAAASUVORK5CYII='"+
	"\n!LAST\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAACxJREFUOE9jcHBw+A/EhxjIBaMGDAYDzMzM/gMx+QYAASsQs0CYo2BEAgYGALC7GdaOpx7MAAAAAElFTkSuQmCC'"+
	"\n!BAR\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAADNJREFUOE9jGAWDATg4OMiTgBmh2hAAKPifBMwF1YYAWBThw1gNwOZUXBjTC6NgwAEDAwBGSDyrun/7KAAAAABJRU5ErkJggg=='"+
	"\n!START\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAC5JREFUOE9jGAVDDTg4OMgCsTwyhkoRB4AavgLxf2QMlSIOUMMAyrwwCmgCGBgAuAgaFbnh+uoAAAAASUVORK5CYII='";


config.shadowTiddlers['NodeTreeStyles'] =
	"/*{{{*/\n"+
	store.getTiddlerText(tiddler.title +'##CSS') +
	"\n/*}}}*/";

store.addNotification('NodeTreeStyles', refreshStyles);

})(jQuery);

//}}}
// /%
/* 
!CSS
.nt-ti {
display: table-row;
vertical-align: middle;
}
.nt-ti:before {
content: '　';
display: table-cell;
vertical-align: middle;
background-image: url([[NodeTreeImages##COMMON]]), url([[NodeTreeImages##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat:
no-repeat;
}
.nt-ti:first-of-type:before{
background-image: url([[NodeTreeImages##FIRST]]), url([[NodeTreeImages##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
.nt-ti-last:before {
background-image:url([[NodeTreeImages##LAST]]), url([[NodeTreeImages##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
.nt-ti:only-child:before,
.nt-ti:only-of-type:before {
background-image: url([[NodeTreeImages##BAR]]);
background-size: 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
.nt-ts, .nt-ts:before {
display: table-cell;
vertical-align: middle;
}
.nt-ts:before {
content: '　';
background-image:url([[NodeTreeImages##COMMON]]);
background-size:100% 100%
}
.nt-ts:first-child:before,
.nt-ts:last-child:before,
.nt-ts:only-child:before{
background-image: none;
}
.nt-ts:before{
display: table-cell;
}
.nt-ts{
display:table-row;
}
.nt-tl{
display: table-cell;
padding-left: 0;
margin-left:0;
vertical-align: middle;}
.nt-tp{
display: table-cell;
vertical-align:middle;
padding-right:1em;
background-image: url([[NodeTreeImages##START]]);
background-size: 16px 16px;
background-position: right;
background-repeat: no-repeat;
}
.nt-tl,
.nt-tp{
border-top:7px solid transparent;
border-bottom:7px solid transparent;
}
.nt-tp + br{
display:none;
}
!END */
// %/