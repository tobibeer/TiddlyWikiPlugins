/***
|''Name''|NodeTreePlugin|
|''Description''|Extends TiddlyWiki list markup to add tree diagram type lists.|
|''Version''|0.5.3|
|''Author''|G.J.Robert Ciang (江瑋平) / Tobias Beer|
|''Documentation''|http://nodetree.tiddlyspace.com|
|''Source''|http://nodetreeplugin.tiddlyspace.com#NodeTreePlugin|
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
					stack.push(createTiddlyElement(target,listType));
				}
			} else if(listType!=baseType && listLevel==1) {
				w.nextMatch -= lookaheadMatch[0].length;
				return;
			} else if(listLevel < currLevel) {
				for(t=currLevel; t>listLevel; t--)
					stack.pop();
			} else if(listLevel == currLevel && listType != currType) {
				stack.pop();
				stack.push(createTiddlyElement(stack[stack.length-1].lastChild,listType));
			}
			currLevel = listLevel;
			currType = listType;
			var e = createTiddlyElement(stack[stack.length-1],itemType);
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
	element: "tp",
	handler: config.formatterHelpers.createElementAndWikify
});

config.shadowTiddlers['StyleSheetNodeTree'] =
	"\n/*{{{*/\n"+
	store.getTiddlerText(tiddler.title +'##CSS') +
	"\n/*}}}*/\n/*\n"+
	"\n!COMMON\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAQRJREFUeF7t0TENwDAQwMCH9vxJpYWQJZKHs3QIPLt7bv0NbxkSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMITGGxBgSY0iMISlnPp2Sauq8hHx5AAAAAElFTkSuQmCC'"+
	"\n!FIRST\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAB9JREFUOE9jGAWjAAQcHBz+A/EhKJd0MGrA0DeAgQEAQ4caCSjqq+0AAAAASUVORK5CYII='"+
	"\n!LAST\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAACxJREFUOE9jcHBw+A/EhxjIBaMGDAYDzMzM/gMx+QYAASsQs0CYo2BEAgYGALC7GdaOpx7MAAAAAElFTkSuQmCC'"+
	"\n!BAR\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAADNJREFUOE9jGAWDATg4OMiTgBmh2hAAKPifBMwF1YYAWBThw1gNwOZUXBjTC6NgwAEDAwBGSDyrun/7KAAAAABJRU5ErkJggg=='"+
	"\n!START\n'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAC5JREFUOE9jGAVDDTg4OMgCsTwyhkoRB4AavgLxf2QMlSIOUMMAyrwwCmgCGBgAuAgaFbnh+uoAAAAASUVORK5CYII='"+
	"\n!END*/";

store.addNotification('StyleSheetNodeTree', refreshStyles);

//}}}
// /%
/* 
!CSS
ti {
display: table-row;
vertical-align: middle;
}
ti:before {
content: '　';
display: table-cell;
vertical-align: middle;
background-image: url([[StyleSheetNodeTree##COMMON]]), url([[StyleSheetNodeTree##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat:
no-repeat;
}
ti:first-of-type:before{
background-image: url([[StyleSheetNodeTree##FIRST]]), url([[StyleSheetNodeTree##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
ti:last-of-type:before {
background-image:url([[StyleSheetNodeTree##LAST]]), url([[StyleSheetNodeTree##BAR]]);
background-size: 100% 100%, 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
ti:only-child:before, ti:only-of-type:before {
background-image: url([[StyleSheetNodeTree##BAR]]);
background-size: 16px 16px;
background-position: left;
background-repeat: no-repeat;
}
ts, ts:before {
display: table-cell;
vertical-align: middle;
}
ts:before {
content: '　';
background-image:url([[StyleSheetNodeTree##COMMON]]);
background-size:100% 100%
}
ts:first-child:before,
ts:last-child:before,
ts:only-child:before{
background-image: none;
}
ts:before{
display: table-cell;
}
ts{
display:table-row;
}
tl{
display: table-cell;
padding-left: 0;
margin-left:0;
vertical-align: middle;}
tp{
display: table-cell;
vertical-align:middle;
padding-right:1em;
background-image: url([[StyleSheetNodeTree##START]]);
background-size: 16px 16px;
background-position: right;
background-repeat: no-repeat;
}
tp+br{
display:none;
}
!END */
// %/