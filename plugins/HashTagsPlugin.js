/***
|''Name''|HashTagsPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Documentation''|http://hashtags.tiddlyspace.com|
|''Requires''||
|''~CoreVersion''|2.5|
|''Version''|0.4.0 (2013-09-05)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/HashTagsPlugin.js|
***/
//{{{
(function ($) {

config.textPrimitives.hashtag = "(?:"+config.textPrimitives.anyLetter+"|\\-)+";
config.textPrimitives.hashes = "[\\#\\§\\$\\!\\%\\&]";

config.macros.hashtag = {
	css: 'hashtag',
	exclude: 'HashTagsConfig##Exclude',
	hashtag: new RegExp("(?: |\t)+?("+config.textPrimitives.hashes.replace(/\\\\/mg,"\\") + ")(" + config.textPrimitives.hashtag + ")", "mg"),
	preview: function(){
		
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var ex=[],hash,hashResults,hx={},hxlist=[],i,l,li,link,ls,next,preview,s,section,singular,t,thetag,out='',
		tids=store.getTiddlers('modified'),
		cmt=config.macros.hashtag,
		exp=(store.getTiddlerText(cmt.exclude)||'').readBracketedList(),
		h=/^(!{1,6})(.*)/,
		tag=params[0],
		getCookie=function(){
			return new Date().formatString('YYYY0MM0DD') + Math.random();
		};
		if(params.contains('categorySearch')){
			createHashTag(place,tag,'','Search for all ' + tag + '-tags...');
			return;
		}
		
		exp.map(function(e){ex.pushUnique(e);});
		for(i=0;i<exp.length;i++){
			store.getTaggedTiddlers(exp[i]).map(function(t){ex.pushUnique(t.title)});
		}
		
		for(i=0;i<tids.length;i++){
			section='';
			tid=tids[i].title;
			if(ex.contains(tid))continue;
			ls=store.getTiddlerText(tid);
			if(ls){
				ls=ls.split('\n');
				for(l=0;l<ls.length;l++){
					li=ls[l];
					hd=h.exec(li);
					if(hd){
						section=hd[2];
					}else{
						hash=cmt.hashtag.exec(li);
						while(hash){
							next=hash[2].length+hash.index+1;
							hash=hash[1] + hash[2].toLowerCase();
							if(hxlist.contains(hash+'s'))hash=hash+'s';
							if(!tag||tag&&(tag.length==1&&hash.substr(0,1)==tag||tag==hash||tag+'s'==hash||tag==hash+'s')){
								if(!hxlist.contains(hash)){
									hxlist.push(hash);
									singular=hash.substr(0,hash.length-1);
									if(hash.substr(hash.length-1,1)=='s'&&hxlist.contains(singular)){
										hx[hash]=hx[singular];
										delete hxlist[singular];
										delete hx[singular];
									}else {
										hx[hash]={};
									}
								}
								if(!hx[hash][tid])hx[hash][tid]=[];
								if(section)hx[hash][tid].pushUnique(section);
							}
							li=li.substr(next,li.length-next);
							cmt.hashtag.lastIndex=0;
							hash=cmt.hashtag.exec(li);
						}
					}
				}
			}
		};

		hxlist.sort();
		if(tag&&tag.length>1)out+='<<hashtag ' + tag.substr(0,1) + ' categorySearch>>\n';
		out+='{{hashtagSearch{'
		for(h=0;h<hxlist.length;h++){
			thetag=hxlist[h];
			preview='{{preview{%0 <<preview [[%1]] [[' + thetag + ']]>>}}}';
			if(!tag||tag.length==1)out+='\n!! '+thetag;
			i=0;
			hashResults=hx[thetag];
			for(t in hashResults){
				i++;
				if(typeof(hashResults[t])=='object'){
					out+='\n#' + preview.format(['Tiddler [['+t+']]' , t]);
					for(s=0;s<hashResults[t].length;s++){
						section=hashResults[t][s];
						if(version.extensions.SectionLinksPlugin)
							out+='\n#*' + preview.format(['[[' + section + '|'+t+'##'+section+']]' , t+'##'+section]);
						else
							out+='\n#*' + preview.format(['Section ' + section , t+'##'+section]);
					}
				}
			}
		}
		wikify(out,place);
		$('.hashtagSearch a',place).each(noClickThrough);
	}
}


//the preview macro
config.macros.preview ={
	
	fullTiddler:true,
	
	//macro handler
	handler: function(place,macroName,params) {

		//needs tiddler or section
		if(!params[0])return;

		//preview level
		var level = params[0].indexOf('##') < 0 ? 'Tiddler' : 'Section';

		//create previewPanel, hide and store params
		$(
			createTiddlyElement(place, "div", null, "previewPanel")
		).css(
			'display' , 'none'
		).attr({
				'refresh' : 'content',
				'tiddler' : params[0],
				'hashtag' : params[1]
		});

		//click handler for preview box
		$(place).last().click( function(ev){
			//vars...
			//are we on section level?
			var section = level == 'Section',
			//when section preview(s) are clicked, close parent tiddler preview ...and vice versa
			close = section ? 'Tiddler' : 'Section',
			//the container in which to close previewPanels
			closeIn,
			//the event
			e = ev || window.event,
			//the clicked preview box
			el = $(this),
			//the previewPanel inside
			panel = el.find('.previewPanel'),
			//whether alt key was pressed
			alt = e.altKey,
			//whether to open and close previews in the whole tiddler ad not just the .hashtagSearch wrapper
			full = config.macros.preview.fullTiddler
			//the tiddler or section to be previewed
			tid = el.attr('tiddler'),
			//the hashtag to be highlighted
			hashtag = panel.attr('hashtag'),
			//whether the clicked previewPanel is open 
 			isOpen = panel.css('display') != "none";

			//select panel(s) depending on alt-key
			panel = alt ? $('.preview' + level, (full ? $(el).parentsUntil(".tiddler"):el.parent().parent())).find('.previewPanel') : panel;
			//empty and hide panel(s) and remove open marker from outer preview
			panel.empty().hide().parent().removeClass('preview' + level + 'Open');

			//container in which previewPanels are to be closed depending on alt key and whether this is a section or tiddler preview
			closeIn = alt ? el.parentsUntil(full ? '.tiddler' : '.hashtagSearch') : (section ? el.parent().parent().parent() : el.next());
			//remove class for open previewPanel at preview box and close previewPanels
			$('.previewPanel', $('.preview' + close + 'Open', closeIn).removeClass('preview' + close + 'Open')).css('display', 'none');

			//when preview was closed and now is to be shown
			if(!isOpen){
				//all panels
				panel.each(function(i){
					//vars...
					//get previewPanel
					var pp = $(this),
					//pass down hashtag
					ht = hashtag,
					//get tiddler
					tid = pp.attr('tiddler'),
					//get tiddler text
					text = store.getTiddlerText(tid);
					//mark preview as open
					pp.parent().addClass('preview' + level + 'Open');
					//if text found -> wikify into previewPanel
					if (text) wikify(text,pp[0],null,store.getTiddler(tid));
					//for all links -> prevent firing the click event at the outer preview when clicked
					$('a',pp).each(noClickThrough);
					//for all hashtags inside the previewPanel
					$('.hashtag',pp).each(function(i){
						//vars...
						//get element
						var el = $(this),
						//get hashtag
						h = el.attr('hashtag');
						//if hashtag is the one to be highlighted (singular or plural) -> highlight otherwise 'dimlight'
						el.addClass(h == ht || h + 's' == ht ? 'highlight' : 'dimlight');
					});
					//toggle panel
					pp.css('display', (isOpen? 'none' : 'block' ));
				});
			}
			//if single panel openend or closed -> scroll to the preview box
			if(panel.length < 2) ensureVisible(panel.parent()[0]);
			
		//add classes to preview
		}).addClass('preview preview' + level);
	}
}

//prevent firing event attached to outer wrappers
function noClickThrough(i,el){
	//wrap the element and give it a click function
	$(this).wrap('<span />').click(function(ev){
		//prevent the event from bubbling
		var e=ev||window.event;
		e.cancelBubble;
		if(e.stopPropagation)e.stopPropagation();
	})
}

//global function to render hashtag
function createHashTag(place, tag, hashtag, title) {
	//the tag is one of a prefix plus a name.... indexed lowercase
	var t=(tag+hashtag).toLowerCase(),
	ti=title?title:t;
	
	h=createTiddlyButton(
		place,
		ti,
		'display search results for: '+ti,
		function(e){
			var title="Search results for %0...".format([ti]);
			if(store.getTiddler(t))
				story.displayTiddler(this,t);
			else {
				config.shadowTiddlers[title] ='<<hashtag [['+ t+']]>>';
				story.displayTiddler(this,title);
			}
			return false;
		},
		config.macros.hashtag.css
	);
	h.setAttribute('hashtag',t);
	return h;
}

//formatter for #tag
config.formatters.push(
{
	name: 'hashTag',
	match: config.textPrimitives.unWikiLink + '?(?:' + config.textPrimitives.hashes + ')' + config.textPrimitives.anyLetterStrict + '+.?',
	lookaheadRegExp: new RegExp(config.textPrimitives.unWikiLink + "?(" + config.textPrimitives.hashes + ")(" + config.textPrimitives.hashtag + ")", "mg"),
	handler: function(w){
		if (w.matchText.substr(0, 1) === config.textPrimitives.unWikiLink) {
			w.outputText(w.output, w.matchStart + 1, w.nextMatch);
			return;
		}
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if (lookaheadMatch && lookaheadMatch.index === w.matchStart) {
			createHashTag(w.output, lookaheadMatch[1],lookaheadMatch[2]);
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
}
,
//formatter for ::category:tag::
{
	name: 'itag',
	match: '\\:\\:(?:' + config.textPrimitives.anyLetter + '+?):{1,1}(?:' + config.textPrimitives.anyLetter + '+?)\\:\\:',
	lookaheadRegExp: new RegExp('\\:\\:(' + config.textPrimitives.anyLetter + '+?):{1,1}(' + config.textPrimitives.anyLetter + '+?)\\:\\:','mg'),
	handler: function(w){
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch && lookaheadMatch.index == w.matchStart) {
			var cat = lookaheadMatch[1],
			symbol = lookaheadMatch[2];
			e = createHashTag(w.output, cat, symbol, cat + ' ' + symbol); 
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
}
);

config.shadowTiddlers.StyleSheetHashTags ='/*{{{*/\n'+
	'.hashtag{font-size:1.2em;color:#339;padding:0 2px;}\n'+
	'.hashtag:hover{color:#22A;background:transparent;text-decoration:underline;}\n'+
	'.preview{display:block;padding:5px;cursor:pointer;}\n'+
	'.preview:hover{background-color:#cdf;}\n'+
	'.previewTiddlerOpen, .previewSectionOpen{background-color:#cdf;}\n'+
	'.previewPanel{display:block;background:#eef;padding:10px;}\n'+
	'dt .previewPanel{font-weight:normal;}\n'+
	'.dimlight {background-color:#f6f6f6;}\n'+
	'/*}}}*/';
store.addNotification("StyleSheetHashTags", refreshStyles);
}(jQuery));
//}}}