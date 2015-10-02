/***
|''Name''|HTML5PlayerPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|turn a list of links to external media into a playlist and player for HTML5 audio or video|
|''Documentation''|http://html5player.tiddlyspace.com|
|''Version''|0.1.1 (2015-10-02)|
|''Requires''|2.5.2|
|''License''|CC BY-SA|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/HTML5PlayerPlugin.js|

{{videoplayer{
# [[Big|http://www.w3schools.com/html/mov_bbb.mp4]]
# [[Buck|http://www.w3schools.com/html/mov_bbb.mp4]]
# [[Bunny|http://www.w3schools.com/html/mov_bbb.mp4]]
}}}
***/
/*{{{*/
(function($){

var initPlayers = function() {
  //all players
  $(".audioplayer, .videoplayer").each(function(i,player) {
    var
      //this player
      $wrap = $(player),
      //play
      play = function() {
        //find player
        var p = $wrap.find("audio, video")[0];
        //toggle play pause
        p.paused ? p.play() : p.pause();
      },
      //clicked to play track
      click2play = function(e){
        //clicked track
        var $track = $(this);
        //remove old playing status
        $wrap.find(".playing").removeClass("playing");
        //set new playing status
        $track.closest("li").addClass("playing");
        //reload player and play
        load(true);
      },
      //change volume
      vol = function(up) {
        var
          //find player
          p = $wrap.find("audio, video")[0],
          //get volume
          v = p.volume;
        //set volume up or down to min 0, max 1
        p.volume = up ? Math.min(v + 0.1, 1) : Math.max(v - 0.1, 0);
      },
      //toggle mute
      mute = function() {
        //find player
        var p = $wrap.find("audio, video")[0];
        //toggle muted
        p.muted = !p.muted;
      },
      //shuffle tracks
      shuffle = function() {
        //get set of random other tracks
        var $rand = $wrap.find("li").not(".playing");
        //remove currently playing
        $(".playing").removeClass("playing");
        //compute random track and set to playing
        $rand.eq(Math.floor(Math.random()*$rand.length)).addClass("playing");
        //reload player
        load(true);
      },
      //next track
      next = function () {
        //remove playing and try to get next track
        var $next = $(".playing").removeClass("playing").next();
        //no next?
        if(!$next.length) {
          //take first
          $next = $wrap.find("li").first();
        }
        //set next track to playing
        $next.addClass("playing");
        //reload player and play
        load(true);
      },
      prev = function() {
        //remove playing status and get previous track
        var $prev = $(".playing").removeClass("playing").prev();
        //no previous?
        if(!$prev.length) {
          //get last track
          $prev = $wrap.find("li").last();
        }
        //set to playing
        $prev.addClass("playing");
        //reload player and play
        load(true);
      },
      //(re)load player
      load = function (autoplay) {
        //all players in the wiki
        $("audio, video").each(function (i,player) {
          //pause
          player.pause();
        });
        var
          //identify player type as video or audio
          type = $wrap.hasClass("videoplayer") ? "video" : "audio",
          //create player and init autoplay
          $player = $("<" + type + " controls" + (autoplay ? " autoplay" : "") + "/>");
        //create source element
        $("<source/>")
          //set attributes
          .attr("src", $(".playing").find("a").attr("src"))
          .attr("type","audio/mpeg")
          //add to player
          .appendTo($player);
        //remove existing player
        $wrap.find("audio, video").remove();
        //add new one
        $player.prependTo($wrap);
        //on track end
        $player.bind('ended error', function() {
            //shuffle enabled ? => shuffle, otherwise next
            $wrap.hasClass("shuffle") ? shuffle() : next();
          });
        //key press handling
        $player.bind("keydown", function(ev) {
            var act,
              //event
              e = ev || window.event,
              //pressed key
              key = e.charCode ? e.charCode : e.keyCode;
            // SPACE
            if (key == 32) {
              //pausePlay
              play();
              act=1;
            // DOWN
            } else if (key == 40) {
              //next track
              next();
              act=1;
            // UP
            } else if (key == 38) {
              //previous track
              prev();
              act=1;
            // ENTER
            } else if (key == 13 && ! e.ctrlKey) {
              //shuffle
              shuffle();
              act=1;
            // M(mute)
            } else if (key == 77) {
              //mute player
              mute();
              act=1;
            // S(huffle)
            } else if (key == 83) {
              //toggle player shuffle
              $wrap.toggleClass("shuffle");
              act=1;
            // + (vol up)
            } else if (key == 171) {
              //increase volume
              vol(1);
              act=1;
            // - (vol down)
            } else if (key == 173) {
              //decrease volume
              vol();
              act=1;
            }
            //any actions performed?
            if(act) {
              //no bubbling
              e.stopPropagation();
            }
          });
        //focus this player
        $player.focus();
      };
    //player / playlist not initialized yet?
    if(!$wrap.hasClass("player")) {
      //add player class
      $wrap.addClass("player");
      //loop external links
      $wrap.find("a.externalLink").each(function(i, a){
        var $a = $(a);
        //create new link
        $("<a>")
          //with src attribute set to previous href
          .attr("src",$a.attr("href"))
          //reuse old title
          .text($a.text())
          //add click handler
          .click(click2play)
          //add after existing
          .insertAfter($a);
        //remove old external link
        $a.remove();
      });
      //find first track and set to playing
      $wrap.find("li").first().addClass("playing");
      //load player, set autoplay depending on class
      load($wrap.hasClass("autoplay"));
    }
  });
}

//hijack core displayTiddler to initialize any players when tiddler opens
Story.prototype.displayTiddlerPLAYER = Story.prototype.displayTiddler;
Story.prototype.displayTiddler =
function (srcElement, tiddler, template, animate, unused, customFields, toggle,animationSrc) {
  //call default
  var results = this.displayTiddlerPLAYER.apply(this, arguments);
  //initialize players
  initPlayers();
  //return
  return results;
}

//add plugin stylesheet as shadow
config.shadowTiddlers.HTML5PlayerStyleSheet = [
"/*{{{*/",
".player audio {",
"  width:100%;",
"}",
".player video {",
"  min-width:480px;",
"}",
".viewer .player ol{",
"  margin:0;",
"  padding:0;",
"  list-style: decimal-leading-zero inside;",
"  border-top: 1px solid #ccc;",
"  color: #ccc; ",
"}",
".player ol li {",
"  position:relative;",
"  margin:0;",
"  padding:0 0 0 10px;",
"  border-bottom: 1px solid #ccc;",
"}",
".player ol li a {",
"  position: relative;",
"  cursor: pointer;",
"  display: inline-block;",
"  width: 85%;",
"  padding: 5px;",
"}",
".player ol li a:before {",
"  content: '♬';",
"  display:block;",
"  position:absolute;",
"  top: 5px; left: -48px;",
"  font-size: 1.2em;",
"  color: transparent;",
"}",
".player.shuffle ol li.playing a:before {",
"  color: #faa;",
"}",
".player ol li.playing a:before {",
"  color: #ccc;",
"}",
"/*}}}*/"
].join("\n");

//add to StyleSheet
setStylesheet(store.getRecursiveTiddlerText("HTML5PlayerStyleSheet"),"HTML5PlayerStyleSheet");

})(jQuery)
/*}}}*/