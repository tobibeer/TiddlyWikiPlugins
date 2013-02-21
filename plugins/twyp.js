/***
|''Name:''|twyp|
|''Description:''|search, play and associate youtube videos|
|''Documentation:''|http://tobibeer.tiddlyspace.com/#twYp|
|''Author:''|Tobias Beer|
|''Version:''|0.9.7 (2010-10-25)|
|''Status:''|beta|
|''CoreVersion:''|2.5.3 or better|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/twyp.js|
!Example
{{{
<<twyp>>
}}}
<<twyp>>
!Code
***/
//{{{
(function ($) {

    window.twyp = {

        /*** TWYP OPTIONS  ***/

        maxSearch: 6,
        maxRelated: 10,
        maxUser: 10,
        vidWidth: 380,
        vidHeight: 320,
        restrictTo: '',
        field: 'youtube',

        /*** LINGO ***/

        txtRelated: 'Related',
        txtUser: 'Best rated videos by ',
        txtPage: 'Go to page ',
        lblShow: 'Play %0',
        tipShow: 'Click to play %0',
        lblHide: 'Close video',
        tipHide: 'Click to close video player',
        txtInfo: 'by %0 | viewed: %1 | favourited: %2 | published: %3',
        txtRating: 'rating: ',
        txtDuration: 'duration: ',
        txtSearch: '-search-',
        lblSearch: 'Please enter a search-term...',
        txtTag: '-category/tag-',
        lblTag: 'Please enter a category or tag filter to constrain the search results by...',
        twypTemplate: 'twyp##TEMPLATE',
        fmtSlider: '<<slider chk%0 twyp##TEMPLATE "Search videos" "Search videos on youtube and add one to the tiddler">>',
        fmtPlayer:
        '<h2><a class="tiddlyLinkExisting" href="#" \
title="add to current tiddler (hold CTRL to skip the prompt and use the title as is)" rel="%0">%1</a></h2> \
<object width="%2" height="%3"> \
<param name="movie" value="%0%4&fs=1&format=5&iv_load_policy=3&enablejsapi=1&playerapiid=%5"/> \
<param name="allowFullScreen" value="true" /> \
<param name="iv_load_policy" value="3" /> \
<param name="wmode" value="transparent" /> \
<param name="allowScriptAccess" value="always"> \
<embed src="%0%4&format=5&fs=1&iv_load_policy=3&enablejsapi=1&playerapiid=%5" \
	type="application/x-shockwave-flash" \
	allowscriptaccess="always" \
	wmode="transparent" \
	width="%2" height="%3" \
	allowfullscreen="true"> \
</embed></object>',

        /*** END OF OPTIONS ***/


        relRelated: 'http://gdata.youtube.com/schemas/2007#video.related',
        mimeFlash: 'application/x-shockwave-flash',
        feeds: 'http://gdata.youtube.com/feeds/standardfeeds/',
        mapQuery: {
            'rated': 'top_rated',
            'recent': 'most_recent',
            'popular': 'most_popular',
            'respond': 'most_responded',
            'discuss': 'most_discussed',
            'featured': 'recently_featured',
            'all': 'videos'
        },
        usrSuffix: '/uploads',
        activeTwyp: null,
        shadows: [],

        appendScript: function (source, id, callback) {
            $('#' + id).remove();
            $('head').append(
                $('<script>').attr({
                    src: source + '&alt=json-in-script&callback=' + callback,
                    id: id,
                    type: 'text/javascript'
                })
            );
        },

        findHref: function (entry, rel) {
            var i, l;
            for (i = 0; l = entry.link[i]; i++) if (l.rel == rel) return l.href;
            return null;
        },

        findMediaHref: function (entry, type) {
            var i, c, p, u;
            for (i = 0; c = entry.media$group.media$content[i]; i++)
                if (c.type == type) {
                    u = c.url;
                    p = u.indexOf('?');
                    return p < 1 ? u : u.substr(0, p);
                }
            alert('?!?');
            return null;
        },

        getResults: function (el, query, search) {
            var c, q,
                page = 1,
                box = $(el).closest('.twyp'),
                tid = $(el).closest('[tiddler]'),
                id = twyp.activeTwyp = tid.attr('twyp'),
                s = search;
            s = s != '' && s != twyp.txtSearch ? s : '';

            if (query) {
                c = el.category.value;
                c = c != '' && c != twyp.txtTag ? '&category=' + c : '';
                box.attr({
                    id: id,
                    field: tid.attr('field'),
                    search: s,
                    cat: c,
                    query: query
                })
            } else {
                s = box.attr('search');
                c = box.attr('cat');
                query = box.attr('query');
                page = parseInt($(el).attr('page'));
            };

            q = twyp.feeds + twyp.mapQuery[query];
            if (query == 'all') q = q.replace('standardfeeds/', '');
            q += '?prettyprint=true&restriction=' + twyp.restrictTo +
                '&max-results=' + twyp.maxSearch +
                '&start-index=' + (((page - 1) * twyp.maxSearch) + 1) +
                (s == '' ? '' : '&vq=' + s) +
                (c ? c : '');
            twyp.appendScript(q, 'twypResults', 'twyp.cbResults');
            twyp.updateNav(page, box);
        },

        cbResults: function (data) {
            try {
                var box = $('#' + twyp.activeTwyp),
                    out = $('.vids', box).empty();

                box.data('main', data.feed);
                $(data.feed.entry).each(function (i, e) {
                    if (!e.yt$noembed) {
                        var ti = e.media$group.media$title.$t,
                            img = $('<img/>'),
                            lnk = $('<a/>'),
                            desc = e.media$group.media$description.$t,
                            p = $('<p>').html(desc);

                        img.attr({
                            src: e.media$group.media$thumbnail[0].url,
                            title: twyp.info(e)
                        }).click(twyp.clickPlay(i, 'main', img[0]));

                        lnk.attr({
                            href: '#',
                            'class': 'tiddlyLinkExisting'
                        }).click(twyp.clickPlay(i, 'main', lnk[0])
                        ).html(ti);

                        out.append(
                            $('<div/>').attr(
                                'class', 'vid'
                            ).append(
                                $('<div/>'
                                ).attr('class', 'desc'
                                ).append(lnk
                                ).append(img
                                ).append($('<span/>'
                                    ).append(
                                        $('<div/>').html(twyp.info(e, true))
                                    )
                                ).append(p
                                ).append(
                                    $('<div/>').attr('class', 'tagClear')
                                )
                            )
                        )
                    }
                });
                if ($.fn.linkify) $('p', out).linkify();
            } catch (e) { alert(e) }
        },

        getRelated: function (num, feed, box) {
            var entry = box.data(feed).entry[num],
                url = twyp.findHref(entry, twyp.relRelated),
                rel = $('.vidRel', box).empty();
            if (url) {
                url = url.split('?')[0];
                rel.html('<h3>' + twyp.txtRelated + '</h3>');
                url += '?&restriction=' + twyp.restrictTo + '&max-results=' + twyp.maxRelated;
                twyp.appendScript(
                    url,
                    'twypRelated',
                    'twyp.cbMore'
                );
            }
        },

        getByUser: function (box, url, name) {
            $('.vidUser', box).empty().html('<h3>' + twyp.txtUser + name + '</h3>');
            twyp.appendScript(
                url + twyp.usrSuffix +
                '?&restriction=' + twyp.restrictTo +
                '&max-results=' + twyp.maxUser +
                '&orderby=rating',
                'twypUser',
                'twyp.cbMore'
            );
        },

        cbMore: function (data) {
            var i, img, e,
                box = $('#' + twyp.activeTwyp),
                feed = data.feed.title.$t.indexOf('Videos related to') == 0 ? 'related' : 'user';

            box.data(feed, data.feed);
            for (i = 0; e = data.feed.entry[i]; i++) {
                img = $('<img/>');
                $(feed == 'user' ? '.vidUser' : '.vidRel', box).append(
                    img.attr({
                        src: e.media$group.media$thumbnail[0].url,
                        rel: e.media$group.media$title.$t,
                        title: twyp.info(e) + ' | ' + twyp.info(e, true)
                    }).click(twyp.clickPlay(i, feed, img[0])
                    ).bind('mouseover mouseout', function (ev) {
                        var e = ev ? ev : window.event,
                            el = $('.' + feed + 'Info');
                        el.empty().html(
                            e.type == 'mouseover' ?
                            this.getAttribute('rel') :
                            '&nbsp;'
                        )
                    })
                )
            }
        },

        info: function (e, r) {
            var a, l, s;
            if (r) {
                r = e.gd$rating,
                    l = e.media$group.media$content[0].duration;
                return [
                    r ? twyp.txtRating + r.average.toString().substr(0, 3) + ' | ' : '',
                    twyp.txtDuration,
                    Math.floor(l / 60),
                    ':',
                    String.zeroPad(l % 60, 2)
                ].join('');
            }
            a = e.author, s = e.yt$statistics;
            return twyp.txtInfo.format([
                a ? a[0].name.$t : '',
                s ? s.viewCount : 'n/a',
                s ? s.favoriteCount : 'n/a',
                e.published.$t.substr(0, 10)
            ])
        },

        clickPlay: function (entry, feed, el) {
            return function () { twyp.playVideo(entry, feed, el); return false; };
        },

        playVideo: function (num, feed, el) {
            twyp.activePlayer = null;
            twyp.newPlayer = true;
            var box = $(el).closest('.twyp'),
                p = box.find('.twplr'),
                e = box.data(feed).entry[num],
                a = e.author,
                plr = twyp.fmtPlayer.format([
                    twyp.findMediaHref(e, twyp.mimeFlash),
                    e.media$group.media$title.$t,
                    twyp.vidWidth,
                    twyp.vidHeight,
                    '&autoplay=1',
                    box.attr('id')
                ]);

            p.html(plr);
            p.find('a').first(
            ).attr('field', box.attr('field')
            ).click(function (ev) {
                var e = ev ? ev : window.event;
                twyp.addToTiddler(e, this);
            });
            p.append(
                $('<div/>'
                ).attr({
                    'class': 'vidDescr',
                    title: (twyp.info(e) + twyp.info(e, true))
                }).html(e.media$group.media$description.$t)
            );
            if ($.fn.linkify) $('.vidDescr', p).linkify();
            twyp.getRelated(num, feed, box);
            if (a && a.length > 0) twyp.getByUser(box, a[0].uri.$t, a[0].name.$t);
        },

        updateNav: function (page, box) {
            var p = page,
                t = twyp.txtPage,
                d = p - 1 < 1 ? 'disabled' : '';

            $('.vidNext', box
                ).css('display', 'inline'
                ).attr({
                    page: p + 1,
                    title: t + (p + 1)
                });
            $('.vidPrev', box
                ).css('display', 'inline'
                ).attr({
                    page: p - 1,
                    title: t + (p - 1),
                    disabled: d
                });
        },

        reset: function (el) {
            var box = $(el).closest('.twyp');
            $('.vids, .colPlayer div[class]', box).empty();
            $('.twplr', box).html('&nbsp;');
            $('.resultsNav', box).hide();
        },

        addToTiddler: function (ev, el) {
            var tid = story.findContainingTiddler(el),
                e = $(el),
                vid = e.html();

            tid = tid ? tid.getAttribute('tiddler') : '';

            if (!tid) return;

            if (!ev.ctrlKey) vid = prompt('Enter your desired video title', vid);
            if (!vid) return;

            store.setValue(tid, e.attr('field'), '[[' + vid + '|' + e.attr('rel') + ']]');
            if (config.options.chkAutoSave) story.saveTiddler(tid);
        },

        stateChange: function (state) {
            var q,
                p = $(this),
                last = p.attr('last'),
                vid = twyp.activePlayer.getVideoUrl(),
                old = vid.indexOf('?v=') > 0;
            vid = vid.split(old ? '?v=' : '#!v=')[1].split('&')[0];
            if (last != vid) {
                p.attr('last', vid);
                if (twyp.newPlayer) { twyp.newPlayer = false; return; }
                if (last) {
                    twyp.activePlayer.pauseVideo();
                    q = 'http://gdata.youtube.com/feeds/api/videos/' + vid + '?v=2';
                    twyp.appendScript(q, 'twypVideoInfo', 'twyp.getVideo');
                }
            }
            twyp.newPlayer = false;
        },

        getVideo: function (data) {
            var box = $('#' + twyp.activeTwyp);
            data.feed = { entry: [data.entry] }
            box.data('video', data.feed);
            twyp.playVideo(0, 'video', box.first());
        }
    }

    //macro handler
    config.macros.twyp = {
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var a, el, plr, sep, title, vid, w,
                tid = story.findContainingTiddler(place),
                p = paramString.parseParams(null, null, true),
                f = getParam(p, 'field', twyp.field),
                not = params.contains('notitle'),
                slide = params.contains('slider'),
                id = 'twyp' + Math.random().toString().substr(3),
                s = params.contains('search');

            if (params.contains('player')) {
                s = s ? '<<twyp %0>>'.format([paramString.replace('player', '')]) : '';

                tid = tid ? tid.getAttribute('tiddler') : '';
                vid = getParam(p, 'video', store.getValue(tid, f));

                wikify(s, place);
                if (!vid) return;

                sep = vid.indexOf('|');
                title = vid.substr(2, sep - 2);
                plr = [
                    '<html>',
                    twyp.fmtPlayer.format([
                        vid.substr(sep + 1, vid.length - sep - 3),
                        title,
                        getParam(p, 'width', twyp.vidWidth),
                        getParam(p, 'height', twyp.vidHeight),
                        slide & !params.contains('noautoplay') ? '&autoplay=1' : '',
                        id
                    ]),
                    '</html>'
                ].join('');

                if (slide) {
                    el = $('<div/>');
                    el.addClass('twypSlider');
                    w = el[0];
                    $(place).append(
                        $('<a>' + twyp.lblShow.format([title]) + '</a>').attr({
                            href: '#',
                            twyp: id,
                            'class': 'button',
                            title: twyp.tipShow.format([title])
                        }).click(function (ev) {
                            var el = $(this),
                                ti = title,
                                id = el.attr('twyp'),
                                p = el.next();
                            if (p.css('display') != 'block') {
                                el.attr({
                                    title: twyp.tipHide,
                                    video: ti
                                }).html(twyp.lblHide);
                                p.attr('twyp', id);
                                config.shadowTiddlers[id] = plr;
                                p.slideDown('slow');
                            } else {
                                ti = el.attr('video');
                                el.attr('title', twyp.tipShow.format([ti])).html(twyp.lblShow.format([ti]));
                                delete config.shadowTiddlers[id];
                                p.slideUp('slow');
                            }
                        })
                    ).append(el);
                };
                wikify(plr, w ? w : place);
                a = $('a', w ? w : place).last();
                if (not) {
                    a.parent().hide().next().css('margin-top', '0.5em');
                } else a.click(function (ev) {
                    var e = ev ? ev : window.event;
                    twyp.addToTiddler(e, this);
                });
            } else {
                wikify(
                    slide ?
                    twyp.fmtSlider.format([id]) :
                    store.getTiddlerText(twyp.twypTemplate),
                    place
                );
                $('.txtSearch', place).last().val(twyp.txtSearch).attr('title', twyp.lblSearch);
                $('.txtTag', place).last().val(twyp.txtTag).attr('title', twyp.lblTag);
                el = slide ? $('[tiddler]', place).last() : $(place).closest('[tiddler]');
                el.attr({
                    twyp: id,
                    field: f,
                    not: not
                });
            }
        }
    }

    story.closeTiddlerTWYP = story.closeTiddler;
    story.closeTiddler = function (title) {
        $('.twypSlider', this.getTiddler(title)).each(function (n, b) {
            delete config.shadowTiddlers[$(b).attr('twyp')];
        });
        story.closeTiddlerTWYP.apply(this, arguments);
    }

    try {
        $.getJSON(
        'http://www.geoplugin.net/json.gp?jsoncallback=?',
        function (d) { if (d) twyp.restrictTo = d.geoplugin_countryCode }
    )
    } catch (e) { }

    window.onYouTubePlayerReady = function (id) {
        $('object, embed', $('#' + id)).each(function (i) {
            try {
                this.addEventListener('onStateChange', 'twyp.stateChange');
                twyp.activePlayer = this;
                $(this).attr('last', null);
            } catch (e) { }
        });
    }

    config.shadowTiddlers.StyleSheetTwyp = "/*{{{*/\n\
.twyp {font-size:12px;} \n\
.twyp .frmSearch{margin:10px 0 0 10px;} \n\
.twyp .txtSearch, .twyp .txtTag{width:100px;} \n\
.twyp input{border:1px solid #ddd;padding:1px 3px;cursor:pointer;} \n\
.twyp input:hover{border:1px solid #999;} \n\
.twyp .colResults {float:left;margin-top:0.5em;width:390px;padding-left:10px;} \n\
.twyp .vids {width:100%;} \n\
.twyp .vids img{margin:5px 0 5px 5px;width:100px;cursor:pointer;float:right;clear:none;} \n\
.twyp .vid{clear:both;font-size:0.9em;padding:5px;} \n\
.twyp .vid:hover{background:#ddd;} \n\
.twyp .desc a{display:block;padding:1px 3px;} \n\
.twyp .desc p{max-height:70px;overflow:hidden;margin-top:5px;display:block;max-width:380px;} \n\
.twyp .desc p a{display:inline;} \n\
.twyp .desc:hover p{width:270px;max-height:200px;overflow:auto;} \n\
.twyp .desc span {font-weight:bold;color:#666;} \n\
.twyp .resultsNav{text-align:right;margin-bottom:2em;} \n\
.twyp .resultsNav input, .btnSearch{margin:0.5em 0 0 0.5em;font-weight:bold;width:80px;} \n\
.twyp .colPlayer {float:left;width:390px;margin:0 5px;} \n\
.twplr .vidDescr {max-height:1.5em;overflow:hidden;} \n\
.twplr .vidDescr:hover {max-height:250px;overflow:auto;} \n\
.twyp .colPlayer img {margin:1px;cursor:pointer;width:72px;height:56px;} \n\
.twyp h2, .twyp h3 {margin-top: 0.6em;} \n\
.twyp .vidUser, .vidRel{margin:0 1em 0 0;} \n\
.twyp .userInfo, .twyp .relatedInfo{padding-right:20px;height:auto;overflow:hidden;font-weight:bold;color:#666;} \n\
.twypSlider {display:none;margin-bottom:10px;} \n\
.twypSlider object{display:block;} \n\
/*}}}*/";
    store.addNotification("StyleSheetTwyp", refreshStyles);

})(jQuery);
//}}}
// /%
/***
!TEMPLATE
<html>
<div class="twyp">
	<form class="frmSearch" onsubmit="twyp.getResults(this,this.query.value,this.search.value); return false;">
		<select name="query">
			<option value="all" selected="true">all videos</option>
			<option value="rated">top rated</option>
			<option value="recent">most recent</option>
			<option value="popular">most popular</option>
			<option value="discuss">most discussed</option>
			<option value="respond">most responded</option>
			<option value="featured">recently featured</option>
		</select>
		<input name="search" class="txtSearch" type="text" value="" onclick="this.select();">
		<input name="category" class="txtTag" type="text" value="" onclick="this.select();">
		<input type="submit" class="btnSearch" value="Search">
		<input type="button" class="btnSearch" value="Reset" onclick="twyp.reset(this);">
	</form>
	<div class="colPlayer">
		<div class="twplr"></div>
		<div>
			<div class="vidRel"></div>
			<div class="relatedInfo">&nbsp;</div>
			<div class="vidUser"></div>
			<div class="userInfo">&nbsp;</div>
		</div>
	</div> 
	<div class="colResults">
		<div class="vids"></div>
		<form class="resultsNav">
			<input type="button" class="vidPrev" value="&laquo; back" style="display: none;" onclick="twyp.getResults(this);"></input>
			<input type="button" class="vidNext" value="next &raquo;" style="display: none;" onclick="twyp.getResults(this);"></input>
		</form>
	</div>
</div>
<div class="tagClear"></div>
</html>
!END*/
//%/