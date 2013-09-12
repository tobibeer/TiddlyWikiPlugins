/***
|Name|TreeDiagramFormatterPlugin|
|Source|http://treedg.tiddlyspace.com/#TreeDiagramFormatterPlugin|
|Documentation|TBD|
|Version|0.4|
|Author|G.J.Robert Ciang (江瑋平)|
|License|CC BY-SA|
|~CoreVersion|2.1+|
|Type|plugin|
|Description|Extends TiddlyWiki list markup to add tree diagram type lists.|
An ugly hack to the built-in TiddlyWiki list markup. Generating a set of 3 HTML elements and uses CSS "table-row" and "table-cell" display attributes.
!Syntax
{{{
&&A parent node (as the root if not behind "%" characters)&&
%1st level child
%1st level 2nd child
%&&1st level child which is a parent itself&&
%%2nd level child
%%2nd level child
?
%&&putting "?" between two children (branches)&&
%%to avoid the lines
%%from linking together
%%&&I can also have&&
%%%3rd level grand-son
///(Another separator or "annotation placeholder", both "?" and "/" can be used)
%%%or grand-daughter
%Isn't this clean?
}}}
Result:
&&A parent node (as the root if not behind "%" characters)&&
%1st level child
%1st level 2nd child
%&&1st level child which is a parent itself&&
%%2nd level child
%%2nd level child
?
%&&putting "?" between two children (branches)&&
%%to avoid the lines
%%from linking together
%%&&I can also have&&
%%%3rd level grand-son
///(Another separator or "annotation placeholder", both "?" and "/" can be used)
%%%or grand-daughter
%Isn't this clean?
!Revision History
*0.4 (2013/09/08): so happy to learn to use ''background images'' (even layered!) to make vertical and horizon bars necessary for this plugin. Now it has a real tree diagram look!
**--''[Issue]'' Using PNG images directly would make Firefox 23 using high CPU. Currently using online images shared from Google Drive drawing.-- Using uploaded bitmaps as branches. Due to [[a bug of Firefox|https://bugzilla.mozilla.org/show_bug.cgi?id=846315]], if you find Firefox using high CPU when the tree diagrams are displayed, please go to __about:config__ and turn ''image.high_quality_downscaling.enabled'' to ''false''. Not sure what functions of Firefox may be affected by this attribute, just a temporary workaround.
*0.3 (2012/11/28): adapting the {{{termRegExp}}} from @line-break-hack space, to allow a second linebreak after each tree item for more readable source codes.
*0.2.2 (2012/11/26): adding {{{vertical-align: middle}}} style to {{{<tl>}}} element too
*0.2.1 (2012/11/20): adding "/" as an alternative marker for {{{<ts>}}} element in addition to "?", so to avoid conflict with my [[(adapted) MediaWikiTableFormatterPlugin]], which uses "?" to denote a {{{<th>}}} in the beginning of a cell.
*0.2 (2012/11/16): adding {{{<ts>}}} element for a blank separator in the tree list; adding syntax instruction
*0.1 (2012/11/13): first working edition
!Code
***/
//{{{
config.formatters.push(
{
	name: "listPlusTreeDiagram",
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
	name: "treeDiagramParentNode",
	match: "&&",
	termRegExp: /(&&)/mg,
	element: "tp",
	handler: config.formatterHelpers.createElementAndWikify
});

setStylesheet(
"ti {display: table-row; vertical-align: middle;}\n"+
"ti:before {content: '　'; display: table-cell; vertical-align: middle; background-image: url(treeDGCommon), url(treeDGHBar); background-size: 100% 100%, 16px 16px; background-position: left; background-repeat: no-repeat;}\n"+
"ti:first-of-type:before {background-image: url(treeDGFirst), url(treeDGHBar); background-size: 100% 100%, 16px 16px; background-position: left; background-repeat: no-repeat;}\n"+
"ti:last-of-type:before {background-image: url(treeDGLast), url(treeDGHBar); background-size: 100% 100%, 16px 16px; background-position: left; background-repeat: no-repeat;}\n"+
"ti:only-child:before, ti:only-of-type:before {background-image: url(treeDGHBar); background-size: 16px 16px; background-position: left; background-repeat: no-repeat;}\n"+
"ts, ts:before {display: table-cell; vertical-align: middle;}\n"+
"ts:before {content: '　'; background-image: url(treeDGCommon); background-size: 100% 100%}\n"+
"ts:first-child:before, ts:last-child:before, ts:only-child:before {background-image: none;}\n"+
"ts:before {display: table-cell;}\n"+
"ts {display: table-row;}\n"+
"tl {display: table-cell; padding-left: 0; margin-left:0; vertical-align: middle;}\n"+
"tp {display: table-cell; vertical-align: middle; padding-right: 1em;}\n"+
"tp+br {display:none;}\n"+
"\n","treeDiagramStyles");
//}}}