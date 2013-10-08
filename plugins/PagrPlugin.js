/***
|''Name''|PagrPlugin|
|''Description''|powerful navigation based on a toc with...<br>» sitemap style breadcrumbs with popup navigation<br>» prev next home buttons<br>» chapter tocs for chapters|
|''Documentation''|http://pagr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''~CoreVersion''|2.5.3|
|''Version''|1.0.1 (2013-10-08)|
|''Readable source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PagrPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
***/
//{{{

(function($){

var me = config.macros.pagr = {

	//localisation
	crumbsSeparator: '»',
	tipSeparator: 'Show other chapter items for "%0"',

	//link formats
	fmtNext: '[[%0]]',
	fmtHome: '[[\u25B2|%0]]',
	fmtPrev: '[[%0]]',

	//no default toc or home tiddler
	toc:'',
	home:'',
	tocClass:'toc',

	handler: function(place, macroName, params, wikifier, paramString, theTiddler){

		//init vars
		var $tid, cx, l, link, links, n, next = [], out='', oul,
			p={}, prev, pos, pg, tid, tidEl, tids, temp, tocTid,
			//parse params
			px = paramString.parseParams('anon', null, true);

		//all params
		[
			'fmtPrev|p',
			'fmtHome|h',
			'fmtNext|n',
			'toc',
			'home',
			'chapter',
			'crumbs',
			'crumbsOnly|bC',
			'crumbsSeparator|cs',
			'tocClass|tc'

		//loop them
		].map(function(x){
			//split by pipe
			x = x.split('|');

			//get param
			p[ x[1] ? x[1] : x[0] ] =
				getParam(
					//from parsed params
					px, x[0],
					//or default or as <true> when unnamed
					me[x[0]] ? me[x[0]] : params.contains(x[0])
				);
		});

		//get toc tiddler or section
		links = store.getTiddlerText(p.toc);

		//find the tid
		tidEl = story.findContainingTiddler(place);
		tid = tidEl ? tidEl.getAttribute('tiddler'):'';

		//neither tid (new or inexisting shadow) nor toc?
		if(!tid || !links)
			//off we go
			return;

		//find section separator
		pos = p.toc.indexOf('##');
		//get toc tiddler
		p.toc = p.toc.substr(0, pos > 0 ? pos : p.toc.length );

		//create temporary container
		temp = $('<div/>');

		//render toc in temporary container
		wikify(links, temp[0]);

		//try to get toc tiddler as either named variable or this tiddler when unnamed
		p.chapter = true === p.chapter ? tid : p.chapter;
		//if generic toc
		if(p.chapter){
			//find tid in toc
			oul = temp.find('[tiddlyLink="' + p.chapter + '"]')
				.first()
				//get next ol or ul
				.next('ol,ul');
			//make pseudo-ol
			if(oul.closest('.pseudo-ol').length)oul.addClass('pseudo-ol');
			//add toc class;
			oul.addClass(p.tc);
			//output
			oul.appendTo(place);
			//done
			return;
		}

		//get crumbs / crumbsOnly as either tid or named param value
		p.crumbs = true === p.crumbs ? tid : p.crumbs;
		p.bC = true == p.bC ? tid : p.bC;
		//if crumbs to be displayed
		if(p.crumbs || p.bC){
			//get global crumbs container
			cx = $('#crumbs');
			//if no global area
			if(!cx.length)
				//find crumbs container in tid
				cx = $(tidEl).find('.crumbs').first();
			//if none
			if(!cx.length) {
				//create one right here
				cx = $('<div class="crumbs"/>').appendTo(place);
			}
			//clear crumbs container
			$(cx).empty();
			//find tid in toc
			$tid = temp.find('[tiddlyLink="' + (p.bC ? p.bC : p.crumbs)  + '"]').first();
			//create list of ols and uls
			oul = tid == p.home ? [] :
				//first add any chapter list
				$tid.next('ol, ul')
				//then any parent ols or uls
				.add($tid.parents('ol, ul'));

			//add home first ...if this tid is in the toc
			if(p.home && tid != p.home && $tid.length){
				//initiate others
				next = [];
				//get all first level list items
				$('ol > li, ul > li', temp).not('li li').each(function(){
					//get tiddlyLink
					var tL = $(this).find('.tiddlyLink').first().attr('tiddlyLink');
					//if it is one, push it
					if(tL && tL != tid)next.push(tL);
				});
				//output  tiddlyLink to home
				createTiddlyLink(cx[0],p.home,true);
				//append separator as button
				$(createTiddlyButton(
					cx[0],
					p.cs,
					//tooltip
					me.tipSeparator.format([p.home]),
					//show popup on click
					me.crumbsPopup,
					'crumbs_separator tiddlyLink'
				)).data('tids',next.slice());
			}

			//loop parents
			for (l = 0; l < oul.length; l++){
				//get the list parent
				link = $(oul[l]).prev();
				//when there's one
				if(link.length){
					//initiate others
					next = [];
					//loop nextings
					link.next().children().each(function(){
						//get tiddlyLink
						var tL = $(this).find('.tiddlyLink').first().attr('tiddlyLink');
						//if it is one, push it
						if(tL && tL != tid)next.push(tL);
					});

					(
						//same as current tiddler?
						tid == link.attr('tiddlyLink') ?
						//just the text
						$('<span class="crumbs_current"/>').text(tid) :
						//otherwise the link
						link
					//append to crumbs
					).appendTo(cx);

					//append separator as button
					$(createTiddlyButton(
						cx[0],
						p.cs,
						//tooltip
						me.tipSeparator.format([link.attr('tiddlyLink')]),
						//show popup on click
						me.crumbsPopup,
						'crumbs_separator tiddlyLink'
					)).data('tids',next.slice());						
				}
			}
			//last empty?
			if(!next.length)
				//remove
				$('.crumbs_separator',cx).last().remove();

			$('.crumbs_separator',cx).each(function(){
				var
					//get button
					$b = $(this),
					//get tidlist
					d = $b.data('tids'),
					//get next tid
					n = $b.next().text(),
					//find in tids
					i = d.indexOf(n);
				//in tids? => remove					
				if(i > -1) d.splice(i,1);
				//none left?
				if(!d.length){
					//exchange button with text
					$('<span class="crumbs_separator"/>')
						.insertAfter($b)
						.text(p.cs);
					//remove the button
					$b.remove();
				}
			})

			//done when only crumbs
			if(p.bC)return;
		}
		//initialise toc-tids
		tids = [];
		//loop all tiddlylinks from rendered toc
		$('.tiddlyLink', temp).each(function(){
			//add to toc-tids
			tids.push( $(this).attr('tiddlyLink') );
		});

		//find current tid in toc
		pos = tids.indexOf(tid);

		//tid not in toc? => nothing to do
		if(pos < 0) return;

		//determine previous and next tid
		prev = pos - 1 < 0 ? -1 : pos-1;
		next = pos + 1 >= tids.length ? 0 : pos + 1;

		//create pagr
		pg = createTiddlyElement(place,'div',null,'pagr');

		//when applicable, output...
		if (p.p && prev >=0 )
			out += '{{pagr_prev{' + p.p.format([ tids[prev] ]) + '}}}';

		if (p.h)
			out += p.h.format([ p.toc      ]);

		if (p.n && next)
			out += '{{pagr_next{' + p.n.format([ tids[next] ]) + '}}}';

		//render output
		wikify(out, pg);
	},

	//renders the crumbs popup
	crumbsPopup: function(ev){
		var n,
			//get event
			e = ev || window.event,
			//the clicked button
			$btn = $(this),
			//new popup
			popup = Popup.create(this),
			//get tids
			tids = $btn.data('tids'),
			//get next tiddlyLink in crumbs
			next = $btn.next().attr('tiddlyLink');
		
		//loop all tids
		tids.map(function(tid){
			//unless it's the next one
			if(tid != next){
				//create a tiddlyLink
				createTiddlyLink(
					createTiddlyElement(popup,"li"),
					tid,
					true
				);
				n++;
			}
		})
		//show the popup and out
		Popup.show();
		e.cancelBubble = true;
		if(e.stopPropagation) e.stopPropagation();
		return false;
	}
}

config.shadowTiddlers.StyleSheetPagr =
'/*{{{*/\n'+
'.pagr {margin: 0 0 0.5em 1em;}\n'+
'.pagr a {padding:5px;}\n'+
'.pagr_prev a:before {content:"« ";}\n'+
'.pagr_next a:after {content:" »";}\n'+
'.crumbs {position:absolute;float:left;font-size:0.8em;top:-1.15em;color:[[ColorPalette::TertiaryLight]]}\n'+
'.crumbs a.tiddlyLink {color:[[ColorPalette::PrimaryLight]];font-weight:normal;}\n'+
'.tiddler:hover .crumbs a.tiddlyLink {color:[[ColorPalette::PrimaryMid]]}\n'+
'.tiddler:hover .crumbs a.tiddlyLink:hover {background:none;color:[[ColorPalette::PrimaryDark]];}\n'+
'.crumbs_separator {padding:0 3px;margin: 0 2px;}\n'+
'/*}}}*/';

store.addNotification("StyleSheetPagr", refreshStyles);

})(jQuery);
//}}}