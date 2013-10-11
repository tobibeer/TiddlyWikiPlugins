/***
|''Name''|PagrPlugin|
|''Description''|powerful navigation based on a toc with... <br>» sitemap style breadcrumbs with popup navigation <br>» prev next home buttons <br>» chapter tocs for chapters <br>» menu highlight|
|''Documentation''|http://pagr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''~CoreVersion''|2.5.3|
|''Version''|1.2.0 (2013-10-11)|
|''Readable source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PagrPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
***/
//{{{

(function($){

var me = config.macros.pagr = {

	//default tiddler for toc and home
	toc:'',
	home:'',
	tiddler:'', //when you don't want to use the containing tiddler

	//menu selector
	menu:'#mainMenu',
	//toc class, to make chapter tocs look like the toc
	tocClass:'toc',

	//localisation
	crumbsSeparator: '»',
	tipSeparator: 'Show other chapter items for "%0"',
	homeText: '%0',

	//link formats
	fmtNext: '[[%0]]',
	fmtHome: '[[\u25B2|%0]]',
	fmtPrev: '[[%0]]',

	fmtTocLink: '[[○|%0]] ',
	fmtNotInToc: '[[○|%0]] ',

	handler: function(place, macroName, params, wikifier, paramString, theTiddler){

		//init vars
		var $tid, cx, el, home, l, link, links, n, next = [], out='', oul,
			p={}, prev, pos, pg, self, tid, tids, temp, tocTid,
			//find the outer tid element
			tidEl = story.findContainingTiddler(place),
			//parse params
			px = paramString.parseParams('anon', null, true);

		//all params
		[
			'fmtPrev|p',
			'fmtHome|h',
			'fmtNext|n',
			'fmtTocLink',
			'fmtNotInToc',
			'toc',
			'home',
			'menu',
			'chapter',
			'crumbs',
			'crumbsOnly|bC',
			'crumbsSeparator|cs',
			'tiddler|tid',
			'homeText',
			'tocClass|tc',

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

		//when specified and existing
		if(p.tid && store.getTiddler(p.tid)){
			//take it
			tid = p.tid;
		//otherwise
		} else {
			//get tiddler name
			tid = tidEl ? tidEl.getAttribute('tiddler'):'';
		}

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

		//try to get the chapter or crumbs tiddler as either...
		//a named variable or this tiddler when unnamed
		['chapter','crumbs','bC'].map(function(v){
			p[v] = true == p[v] ? tid : p[v];
		});


		// MENU UPDATE //

		//get menu links
		links = $('.tiddlyLinkExisting', p.menu);
		//if a menu is defined and there are any links
		if(p.menu && links.length){

			//find specified tiddler in toc
			$tid = temp.find('[tiddlyLink="' + tid + '"]').first();

			//first, remove selected class
			links.removeClass('pagr_selected');

			//each menu link
			$.each(links, function(){
				var found,
					//get link element
					l = $(this),
					//get tiddler
					t = l.attr('tiddlyLink');
				//when direct menu item
				if(t == tid){
					//set selected class
					l.addClass('pagr_selected');
					//stop looping
					return false;					
				}
				//loop parents
				$.each($tid.parents('ol, ul'), function(){
					//the link
					var pL = $(this).parent().children('.tiddlyLink').first();
					//when matching
					if(t == pL.attr('tiddlyLink')){
						//set found
						found = 1;
						//set selected class
						l.addClass('pagr_selected');
						//stop looping
						return false;
					}
				});
				//stop when when found
				return !found;
			})
		}


		// CHAPTERS //

		//if generic toc
		if(p.chapter){
			//find tiddler in toc
			$tid = temp.find('[tiddlyLink="' + p.chapter + '"]').first();
			//get next ol or ul for tocLink
			oul = $tid.next('ol,ul');
			//make pseudo-ol
			if(oul.closest('.pseudo-ol').length)oul.addClass('pseudo-ol');
			//add toc class;
			oul.addClass(p.tc);
			//output
			oul.appendTo(place);
			//done
			return;
		}

		
		// CRUMBS //

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
			cx.empty();

			//add another container
			cx = $('<span class="pagr_crumbs"/>').appendTo(cx);

			//find tid in toc
			$tid = temp.find('[tiddlyLink="' + (p.bC ? p.bC : p.crumbs)  + '"]').first();

			//create list of ols and uls
			oul = tid == p.home ? [] :
				//first add any chapter list
				$tid.next('ol, ul')
				//then any parent ols or uls
				.add($tid.parents('ol, ul'));

			//add home first ...if this tid is in the toc
			if(p.home && $tid.length){
				//initiate other first level subitems
				next = [];
				//get all first level list items
				$('ol > li, ul > li', temp).not('li li').each(function(){
					//get tiddlyLink
					var tL = $(this).find('.tiddlyLink').first().attr('tiddlyLink');
					//if it is one, push it
					if(tL && tL != tid)next.push(tL);
				});

				//text to display for home
				home = p.homeText.format([p.home]);
				//don't link homw when we're there already
				if(tid != p.home){
					//output  tiddlyLink to home
					el = createTiddlyLink(cx[0],p.home,false);
					createTiddlyText(el, home);
				} else {
					createTiddlyText(cx[0],home);
				}
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
			$.each(oul, function(i,l){
				//get the list parent
				link = $(l).parent().children('.tiddlyLink').first();
				//same as current tid?
				if(tid == link.attr('tiddlyLink'))
					//handle only once
					if(self) return true; else self = 1;
				//when there's one
				if(link.length){
					//initiate others
					next = [];
					//loop nextings
					link.nextAll('ol, ul').children().each(function(){
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
			});
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

			//when toclink active
			if(p.fmtTocLink){
				//empty container
				el = $('<span class="pagr_toclink"/>');
				//render link
				wikify(
					//tid in toc => toclink otherwise empty message
					p[ $tid.length ? 'fmtTocLink' : 'fmtNotInToc'].format(p.toc),
					el[0]
				);
				//prepend to crumbs
				el.insertBefore(cx);
			}

			//done when only crumbs
			if(p.bC)return;
		}


		// PAGING //

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