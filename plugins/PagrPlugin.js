/***
|''Name''|PagrPlugin|
|''Description''|powerful navigation based on a toc with... <br>» sitemap style breadcrumbs with popup navigation <br>» prev next home buttons <br>» chapter tocs for chapters <br>» menu highlight|
|''Documentation''|http://pagr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''~CoreVersion''|2.5.3|
|''Version''|1.3.0 (2013-10-11)|
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
	menuSelector:'#mainMenu',
	//default submenu selector
	sub: '#subMenu',
	//toc class, to make chapter tocs look like the toc
	tocClass:'toc',
	//whether to use pretty titles in crumbs
	prettyCrumbs: true,

	//localisation
	crumbsSeparator: '»',
	tipSeparator: 'Show other chapter items for "%0"',
	alt: '', //alternative content displayed when in Start tiddler
	homeText: '%0',  //home page text on homepage
	homeTextSub: '%0', //home page text on subpage

	//link formats
	fmtNext: '[[%0]]',
	fmtHome: '[[\u25B2|%0]]',
	fmtPrev: '[[%0]]',

	fmtTocLink: '[[○|%0]] ',
	fmtNotInToc: '[[○|%0]] ',

	handler: function(place, macroName, params, wikifier, paramString, theTiddler){

       	//create refresh wrapper
        $el = $('<span class="pagr_refresh"/>')
        	//append to place
        	.appendTo(place)
        	//set wrapper attributes for refresh
        	.attr({
            	'refresh': 'macro',
            	'macroName': 'pagr',
            	'params': paramString })
        	.data({
        		params: params
        	});

        //run refresher
        me.refresh($el[0],paramString);
	},

    //the refresh handler
    refresh: function(el, paramString){
		//init vars
		var $tid, tocLinks, cx, elem, home, l, links, n, next = [],
			out='', oul, p={}, prev, pos, pg, sub, self,
			tid, tids, toc, tocTid, where,
			//get params and place
			params = $(el).data('params'),
			//find the outer tid element
			tidEl = story.findContainingTiddler(el),
			//parse params
			px = paramString.parseParams('anon', null, true),
			//get submenu value
			sub = getParam(px,'sub', params.contains('sub'));

		//empty any previous output
		$(el).empty();

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
			'menuSelector',
			'controls',
			'paging',
			'chapter',
			'crumbs',
			'crumbsOnly|bC',
			'crumbsSeparator|cs',
			'tiddler|tid',
			'homeText',
			'homeTextSub',
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

		//render toc 
		toc = me.renderToc(links);
		//create shallow clone that won't get sliced (doesn't need event handlers)
		tocLinks = toc.clone();

		//try to get the chapter or crumbs tiddler as either...
		//a named variable or this tiddler when unnamed
		['chapter','crumbs','bC'].map(function(v){
			p[v] = true == p[v] ? tid : p[v];
		});


		// MENU UPDATE //

		//if a menu update is wanted
		if(p.menu){
			//highlight menu for tid
			me.highlightMenu(p.menuSelector, tid, tocLinks);
		}

		// CHAPTER TOC or SUBMENU //
		// moves elements from rendered toc to elsewhere //

		//chapter or sub defined
		if(p.chapter || sub){
			//determine if submenu to be rendered
			sub = true === sub ? me.sub : sub;
			//determine where
			where = sub ? $(sub) : el;
			//when chapter or submenu container found
			if(p.chapter || where.length){
				//find tiddler or chapter tiddler in toc
				$tid = toc.find('[tiddlyLink="' + (
					sub ?
					$('.pagr_selected',p.menuSelector).first().attr('tiddlyLink') :
					p.chapter
				) + '"]').first();
				//get next ol or ul for tocLink
				oul = $tid.next('ol,ul');
				//make pseudo-ol
				if(oul.closest('.pseudo-ol').length)
					oul.addClass('pseudo-ol');
				//empty submenu
				if(sub) where.empty();
				//otherwise add toc class
				else oul.addClass(p.tc);

				//output chapters
				oul.appendTo(where);
				//highlight submenu
				me.highlightMenu(sub, tid, tocLinks);
				//done when chapter only
				if(p.chapter){
					return;
				}
			}
		}

		// CRUMBS //

		//if crumbs to be displayed
		if(p.crumbs || p.bC){
			//crumbs only
			if(p.bC){
				//create container
				cx = $('<div class="crumbs"/>');
				cx.appendTo(el);
			}
			//not created yet?
			if(!cx){
				//get global crumbs container
				cx = $('#crumbs');}
			//if no global area
			if(!cx.length)
				//find crumbs container in tid
				cx = $(tidEl).find('.crumbs').first();
			//still none
			if(!cx.length)
				//create one right here
				cx = $('<div class="crumbs"/>').appendTo(el);

			//clear crumbs container
			cx.empty();

			//add another container
			cx = $('<span class="pagr_crumbs"/>').appendTo(cx);

			//find tid in toc
			$tid = tocLinks.find('[tiddlyLink="' + (p.bC ? p.bC : p.crumbs)  + '"]').first();

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
				$('ol > li, ul > li', toc).not('li li').each(function(){
					//get tiddlyLink
					var tL = $(this).find('.tiddlyLink').first().attr('tiddlyLink');
					//if it is one, push it
					if(tL && tL != tid)next.push(tL);
				});

				//text to display for home
				home = p[tid == p.home ? 'homeText' : 'homeTextSub'].format([p.home]);
				//don't link homw when we're there already
				if(tid != p.home){
					//output  tiddlyLink to home
					elem = createTiddlyLink(cx[0],p.home,false);
					createTiddlyText(elem, home);
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
				//when home tiddler and alternative text
				if(tid == p.home && me.alt){
					//wikify alternative text
					wikify(me.alt, cx[0]);
				}
			}

			//loop parents
			$.each(oul, function(i,l){
				var
					//get the list parent
					link = $(l).parent().children('.tiddlyLink').first(),
					//get the tiddler
					ti = link.attr('tiddlyLink');
				//same as current tid?
				if(ti == tid)
					//handle only once
					if(self) return true; else self = 1;
				//when there's one
				if(ti){
					//initiate others
					next = [];
					//loop nextings
					link.nextAll('ol, ul').children().each(function(){
						//get tiddlyLink
						var tL = $(this).find('.tiddlyLink').first().attr('tiddlyLink');
						//if it is one, push it
						if(tL && tL != tid) next.push(tL);
					});

					//same as current tiddler?
					if(ti == tid)
						//just the text
						createTiddlyElement(cx[0],'span',null,'crumbs_current', me.prettyCrumbs ? link.text() : ti);
					//otherwise
					else {
						//the link
						elem = createTiddlyLink(cx[0], ti, !me.prettyCrumbs );
						//set pretty title
						if(me.prettyCrumbs) {
							createTiddlyText(elem, link.text());
						}
					}

					//append separator as button
					$(createTiddlyButton(
						cx[0],
						p.cs,
						//tooltip
						me.tipSeparator.format([ ti ]),
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
				elem = $('<span class="pagr_toclink"/>');
				//render link
				wikify(
					//tid in toc => toclink otherwise empty message
					p[ $tid.length ? 'fmtTocLink' : 'fmtNotInToc'].format(p.toc),
					elem[0]
				);
				//prepend to crumbs
				elem.insertBefore(cx);
			}

			//done when only crumbs
			if(p.bC)return;
		}



		// PAGING //

		//when explicitly enabled
		if(p.paging || p.controls){
			//initialise toc-tids
			tids = [];
			//loop all tiddlylinks from rendered toc
			$('.tiddlyLink', tocLinks).each(function(){
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
			pg = createTiddlyElement(el,'div',null,'pagr');

			//when applicable, output...
			if (p.p && prev >=0 )
				out += '{{pagr_prev{' + p.p.format([ tids[prev] ]) + '}}}';

			if (p.h)
				out += p.h.format([ p.toc      ]);

			if (p.n && next)
				out += '{{pagr_next{' + p.n.format([ tids[next] ]) + '}}}';

			//render output
			wikify(out, pg);
		}

		//dispose of garbage
		toc.add(tocLinks).remove();
	},

	//creates a temporary container for inspecting the rendered toc
	renderToc: function(what){
		//create wrapper
		var el = $('<div/>');
		//render toc in temporary container
		wikify(what, el[0]);
		//return
		return el;
	},

	//highlights items in the menu(s)
	highlightMenu: function(selector, tid, toc){
		//loop all menu selectors
		$(selector).each(function(){
			var 
				//get menu links
				links = $('.tiddlyLinkExisting', this),
				//find specified tiddler in toc
				$tid = toc.find('[tiddlyLink="' + tid + '"]').first();

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
		})
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

config.shadowTiddlers.StyleSheetPagr = [
'/*{{{*/',
'.pagr {margin: 0 0 0.5em 1em;}',
'.pagr a {padding:5px;}',
'.pagr_prev a:before {content:"« ";}',
'.pagr_next a:after {content:" »";}',
'.crumbsHeader {position:absolute;float:left;font-size:0.8em;top:-1.15em;color:[[ColorPalette::TertiaryLight]];}',
'.crumbsHeader a.tiddlyLink {color:[[ColorPalette::PrimaryLight]];font-weight:normal;}',
'.tiddler:hover .crumbsHeader a.tiddlyLink {color:[[ColorPalette::PrimaryMid]]}',
'.tiddler:hover .crumbsHeader a.tiddlyLink:hover {background:none;color:[[ColorPalette::PrimaryDark]];}',
'.crumbs_separator {padding:0 3px;margin: 0 2px;}',
'/*}}}*/'
].join('\n');

store.addNotification("StyleSheetPagr", refreshStyles);

})(jQuery);
//}}}