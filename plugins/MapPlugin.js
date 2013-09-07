/***
|''Name''|MapPlugin|
|''Author''|Tobias Beer|
|''Version''|0.3.0 (2013-09-06)|
|''Documentation''|http://tobibeer.tiddlyspace.com/#Maps|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/MapPlugin.js|
!Usage
Create static maps for tiddlers with either ''geo.loc'' or ''geo.long'' and ''geo.lat'' fields set.
{{{
<<map>>

<<map
  zoom:16
  width:300
  height:300
  loc:"statue of liberty"
  maptype:hybrid
  label:L
  color:yellow
>>
}}}
<<map>>
***/
//{{{
(function($) {

//the map macro
config.macros.map = {

	defaultMap: 'google',

	google:{
		zoom: 13,
		width: '600',
		height: '400',
		maptype: 'roadmap',

		label: '',
		color: 'red',
		marker: true,
		markers: '&markers=color:%0|label:%1|%02',

		img: [
			"http://maps.google.com/maps/api/staticmap?",
			"&center=%0",
			"&zoom=%1",
			"&size=%2x%3", 
			"&maptype=%4",
			"&sensor=false%5"
		],

		link: "http://maps.google.com/maps?saddr=%0",

		//no defaults for these
		loc: '',
		lat: '',
		'long': ''

	},

	excludeParams: {
        google: ['markers', 'img', 'link'],
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {

		var $link, p = {}, cfg = this,
			ps = '<<map ',
			px = paramString.parseParams("anon", null, true),
			map = getParam(px,'map',this.defaultMap),
		    //get map defaults
		    def = cfg[map] || cfg['google'];

		//loop all defaults
		$.each(def, function (key, val) {
			p[key] = getParam(px, key, val).toString();
		});

		//get lat & long from either params or tid
		if(!p.loc)
			p.loc = tiddler ? tiddler.fields["geo.loc"] : '';

		if(!p['long'])
			p['long'] = tiddler ? tiddler.fields["geo.long"] : '';

		if(!p.lat)
			p.lat = tiddler ? tiddler.fields["geo.lat"] : '';

		if(p.loc)
			p.loc = p.loc.replace(/W/mg, '+');

		//when both latitude and longitude given
		if (p.loc || p.lat && p['long']) {
		    p.loc =
		    	p.loc ?
		    	p.loc :
		    	p.lat + ',' + p['long'];

			$.each(p, function(key, val){
			    ps += cfg.excludeParams[map].contains(key) || !val ? '' :
                        key + ':[[' + val + ']] ';
			});

			$link = $("<a />")
				.attr({
				    href: def.link.format([ p.loc ]),
					target: '_blank',
					imgwidth: p.width
				})
				.data({
				    params: p,
				    paramString: ps + '>>'
				 })
				.appendTo(place)
				.click(this.click);

			$("<img />")
				.attr({
					src: def.img.join("").format([
						p.loc,
						p.zoom,
						p.width,
						p.height,
						p.maptype,
						p.marker ? p.markers.format([
							p.color,
							p.label,
							p.loc
						]) : ''
					])
				}).appendTo($link);
		}
	},

	//link clicked
	click: function(e){
		var input,
			$l = $(this),
			$i = $l.next('.map_code');

		//get event
		e = e || window.event;
		//ctrl or alt
		if (e.ctrlKey || e.altKey || e.shiftKey) {
            //shift pressed?
		    if (e.shiftKey) {
		        input = prompt('Enter "title|location" for the new tiddler.');
		        if (input) {
		            input = input.split('|');

		        }
		        return false;
		    }
			//create input element
			if(!$i.length)$i = $('<input class="map_code" type="text"/>')
				.css({
					display: 'block',
					width: $l.attr('imgwidth') + 'px'
				})
				.insertAfter($l);

			//set value
			$i.val(e.ctrlKey ? $l.html() : $l.data('paramString'))
				.focus()
				.select();
			return false;
		} else {
			$i.remove();
			return true;
		}
	}
}

})(jQuery);
//}}}