/***
|''Name''|LinksPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|outputs links in tiddlers|
|''Documentation''|http://links.tiddlyspace.com|
|''Version''|0.5.1 (2013-10-01)|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/LinksPlugin.js|
***/
/*{{{*/
(function ($){
	
var me = config.macros.links = {

	defaults:{
		fmtTiddler: '\n;[[%0]]',
		fmtInternal: '[[%0|%1]]',
		fmtInternalItem: '\n:%0%1',
		fmtInternalPlus: '\n:*[[%0]]',
		fmtExternal: '[[%0|%1]]',
		fmtExternalItem: '\n:%0%1',
		fmtExternalPlus: '\n:*%0',
		fmtSeparator: ', ',
		classTiddler: 'tiddlerLinks',

		external: true,
		internal: true,
		listfiltr: true,

		sort: 'title',
		exclude: 'excludeLists excludeSearch systemConfig',

		//empty defaults
		filter: '',
		title: '',
		link: '',
		tiddler:'',
	},

	//macro handler
	handler: function(place,macroName,params,wikifier,paramString,tiddler) {
		me.refresh(
			$('<span class="linkIndex"/>')
				.appendTo(place)
		        //set wrapper attributes for refresh
		        .attr({
		            'refresh': 'macro',
		            'macroName': 'links',
		            'params': paramString
		        })[0],
		    paramString
	    );
	},

	//refreshing
	refresh : function (place, paramString){
		$(place).empty();
		var out = '', sep, tids, p ={}, tids =[],
			//parse params
			px = paramString.parseParams('anon', null, true),
			params = px[0]['anon'] || [];

		//loop all defaults
		$.each(me.defaults,function(key,val){
			//initialize param variable as given by params
			p[key] = getParam( px, key, val);

			//if a named parameter, set as true anyways
			if (params.contains(key)) p[key] = true;
		});

		//all boolean params
		[
			'external',
			'internal',
			'listfiltr'
		//loop params
		].map(function (b) {
			//set depending on whether true
			p[b] = 'true' == p[b].toString();
		});

		//tiddler specified?
		if(p.tiddler){
			//add tiddler
			tids.push(store.getTiddler(p.tiddler));
		//not specified?
		} else {
			//get tids from
			tids =
				//filter specified
				p.filter ?
				//from filtered tids
				store.filterTiddlers(p.filter) :
				//otherwise all tids
				store.getTiddlers(p.sort);
		}

		//turn exclude into array
		p.exclude = p.exclude.readBracketedList();
		//shortcut to separator
		sep = p.fmtSeparator;

		p.tids = {};

		//loop all tids
		tids.map(function(tid){
			//only when
			if(
				//not
				!(
					//excluded OR
					p.exclude.contains(tid.title) ||
					//having an exclude tag
					p.exclude.containsAny(tid.tags)
				)
			){
				//get links
				me.getLinks(p, tid);
			}
		});

		//loop all tids
		$.each(p.tids, function(key,val){
			//add tids
			out += p.fmtTiddler.format([key]);
			//loop all links
			$.each(val, function(key,val){
				var last, n=0, title, v, lx = '',
					//check if external link
					isExternal = config.formatterHelpers.isExternalLink(key);
				for(v=0; v<val.length; v++){
					//get link title
				    title = val[v];
				    if(
				    	key==title &&
				    	(
				    		isExternal && p.fmtExternalPlus ||
				    		!isExternal && p.fmtInternalPlus
				    	)
		    		) continue;
				    n++;
					//output link
					lx += p[isExternal ? 'fmtExternal' : 'fmtInternal']
						.format([title,key]) +
						(v < val.length - 1 ? sep : '');
				};
				last = lx.length - sep.length;
				if(lx.lastIndexOf(sep) == last) lx = lx.substr(0,last)
				out += p[isExternal ? 'fmtExternalItem' : 'fmtInternalItem']
					.format([
						(
							n ?
							lx:
							p[isExternal?'fmtExternal':'fmtInternal'].format([key, key])
                        ),
						(
							p.fmtExternalPlus || p.fmtInternalPlus ?
							(
								!n ?
								'' :
								p[isExternal ? 'fmtExternalPlus' : 'fmtInternalPlus'].format([key])
							) :
							key
						)
					]);
			});
		});
		//output
		wikify(
			'{{listfiltrLinks' +
				(p.tiddler ? ' ' + p.classTiddler : '') +
			'{'+
			out +
			'\n}}}' +
			(
				p.listfiltr && config.macros.listfiltr ?
				'<<listfiltr>>' :
				''
			),
			place
		);
	},

	//getLinks
	getLinks: function(p, tid){
		//init vars
		var lastIndex, match, t, preMatch , preRegExp,
			//get link regexp
			linkRegExp = config.textPrimitives.tiddlerAnyLinkRegExp,
			// remove 'quoted' text before scanning tiddler source
			text = tid.text.replace(/\/%((?:.|\n)*?)%\//g,"").
			replace(/\{{3}((?:.|\n)*?)\}{3}/g,"").
			replace(/"""((?:.|\n)*?)"""/g,"").
			replace(/<<((?:.|\n)*?)\>\>/g,"").
			replace(/<nowiki\>((?:.|\n)*?)<\/nowiki\>/g,"").
			replace(/<html\>((?:.|\n)*?)<\/html\>/g,"").
			replace(/<script((?:.|\n)*?)<\/script\>/g,"") + ' ',
			//helper function to add a link to the index
			add = function(tiddler, target, title){
				//check if external link
				isExternal = config.formatterHelpers.isExternalLink(target);
				if(
					p.title && title.toLowerCase().indexOf(p.title.toLowerCase()) < 0 ||
					p.link && target.toLowerCase().indexOf(p.link.toLowerCase()) < 0 ||
					!p.internal && !isExternal ||
					!p.external && isExternal
				) return;
				var tidTargets,
					tidIndex = p.tids[tiddler];
				//add tiddler to tidIndex if not in it yet
				if(!tidIndex) tidIndex = p.tids[tiddler] = {};
				tidTargets = tidIndex[target];
				//add link title to tidIndex if not in it yet
				if(!tidTargets) tidTargets = tidIndex[target] = [];
				//add title for this target
				tidTargets.pushUnique(title);
			};

		linkRegExp.lastIndex = 0;
		match = linkRegExp.exec(text);
		while(match) {
			lastIndex = linkRegExp.lastIndex;
			if(match[1]) {
				// wikiWordLink
				if(match.index > 0) {
					preRegExp = new RegExp(config.textPrimitives.unWikiLink+"|"+config.textPrimitives.anyLetter,"mg");
					preRegExp.lastIndex = match.index-1;
					preMatch = preRegExp.exec(text);
					if(preMatch.index != match.index-1)
						add(tid.title,match[1],match[1]);
				} else {
					add(tid.title,match[1],match[1]);
				}
			}
			//titledBrackettedLink
			else if(match[2])
				add(tid.title,match[3], match[2]);
			// brackettedLink
			else if(match[4])
				add(tid.title,match[4], match[4]);
			else if(match[0])
				add(tid.title,match[0], match[0]);

			//set index to last
			linkRegExp.lastIndex = lastIndex;
			//get next
			match = linkRegExp.exec(text);
		}
	}
}

config.shadowTiddlers['StyleSheetLinksPlugin'] =
'/*{{{*/\n' +
'.tiddlerLinks > dl > dt,\n'+
'.tiddlerLinks > .lf-list > dl > dt\n'+
'{display:none;}\n' +
'.tiddlerLinks > dl > dd,\n'+
'.tiddlerLinks > .lf-list > dl > dd\n'+
'{margin:0;}\n' +
'.tiddlerLinks > dl > dd:before,\n'+
'.tiddlerLinks > .lf-list > dl > dd:before\n'+
'{content:"";}\n' +
'/*}}}*/';
store.addNotification('StyleSheetLinksPlugin', refreshStyles);

})(jQuery);
/*}}}*/