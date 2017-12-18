/***
|''Name:''|SlideShowPlugin|
|''Description:''|Creates a slide show from any number of tiddlers|
|''Documentation:''|[[SlideShowPlugin Documentation|SlideShowPluginDoc]]|
|''Author:''|Paulo Soares / fork: [[Tobias Beer|http://tobibeer.github.io]]|
|''Contributors:''|John P. Rouillard|
|''Version:''|2.4.4 (2013-10-08)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/forked/PauloSoares/SlideShowPlugin.js|
|''Master:''|http://www.math.ist.utl.pt/~psoares/addons.html|
|''License:''|[[Creative Commons Attribution-Share Alike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion:''|2.5.0|
This fork introduces the {{{controls}}} parameter that allows to show the controls by default.

Provides mobile touch support: install touchwipe as a plugin...
http://www.netcu.de/jquery-touchwipe-iphone-ipad-library
***/
//{{{
(function($) {

//# ensure that the plugin is only installed once
if(!version.extensions.SlideShowPlugin) {
  version.extensions.SlideShowPlugin = {
    installed: true
  };

var me = config.macros.slideShow = {

maxTOCLength: 30,
separator: '-s-',

text: {
  label: "slide show",
  tooltip: "Start the slide show",
  quit: {
    label: "x",
    tooltip: "quit",
    button: 'quit slideshow'
  },
  firstSlide: {
    label: "<<",
    tooltip: "first slide"
  },
  previous: {
    label: "<",
    tooltip: "previous slide"
  },
  next: {
    label: ">",
    tooltip: "next slide"
  },
  lastSlide: {
    label: ">>",
    tooltip: "last slide"
  },
  goto: {
    label: "Go to slide:"
  },
  resetClock: {
    tooltip: "reset clock"
  },
  overlay: "overlay"
},

handler: function(place, macroName, params, wikifier, paramString){
  var px = paramString.parseParams(null,null,false);
  createTiddlyButton(
    place,
    getParam(px, "label", me.text.label),
    getParam(px, "tooltip", me.text.tooltip),
    function(){
      me.onClick(place, paramString);
      return false;
    }
  );
  return false;
},

onClick: function(place, paramString) {
  var slide,
    count = 0,
    t0 = new Date(0), 
    title = story.findContainingTiddler(place),
    px = paramString.parseParams(null,null,false),
    params = paramString.readMacroParams();

  title = title ? title.getAttribute("tiddler") : null;
  title =  getParam(px,"tiddler", title);

  me.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  me.blocked = 0;
  me.slides = [];
  me.slideTOC = [];
  me.openTiddlers = [];

  me.single = params.contains('single');
  me.clicks = !params.contains('noClicks');
  me.keyboard = !params.contains('noKeyboard');
  me.showAll = params.contains('showAll');
  me.cycle = params.contains('cycle');
  me.overlays = !params.contains('noOverlays');
  me.controls = params.contains('controls');

  me.theme = getParam(px,"theme");
  me.tag = getParam(px,"tag");
  me.toc = getParam(px,"toc","headers");
  me.sort = getParam(px,"sort");
  me.clockFormat = getParam(px,"clockFormat",'0hh:0mm:0ss');
  me.auto = getParam(px,"auto",0);
  me.header = getParam(px,"header",title);
  me.footer = getParam(px,"footer","");
  me.clock = getParam(px,"clock");
  me.clockType = parseFloat(me.clock);

  if(me.clock){
    me.clockCorrection = t0.getTimezoneOffset() * 60000;
    t0 = new Date();
    me.clockMultiplier = 1;
    me.clockInterval = 0;
    if(me.clockType < 0) {
      me.clockMultiplier = -1;
      me.clockInterval = -me.clockType*60000;
    } else if(me.clockType == 0){
      me.clockCorrection = 0;
      t0 = new Date(0);
    }
    me.clockStartTime = t0.getTime();
  }

  $("#tiddlerDisplay > *").each(function(){
    me.openTiddlers.push( $(this).attr('tiddler') )
  });

  //slideshow in one tiddler
  if(me.single){
    if(!store.tiddlerExists(title)) return;
    $.each(
      store.getTiddlerText(title).split(me.separator),
      function(){
        count++;
        slide = new Tiddler();
        slide.title ="TempSlide" + count;
        slide.tags[0] = "excludeLists";
        slide.text = $.trim(this);
        slide.fields['doNotSave'] = true;
        store.addTiddler(slide);
        me.buildTOC(count,slide.title);
        me.slides.push(slide.title);
      }
    )

  //slideshow by tag
  } else if(me.tag){
    $.each(
      store.getTaggedTiddlers(me.tag, me.sort),
      function(){
        count++;
        me.buildTOC(count,me.title);
        me.slides.push(me.title);
      }
    )

  //slideshow by links
  } else {
    story.displayTiddler(null,title);
    $.each(
      $('[tiddler=' + title + ']').find('.viewer').find('.tiddlyLinkExisting'),
      function(){
        if(!$(this).parents().hasClass("exclude")){
          slide = $(this).attr('tiddlylink');
          count++;
          me.buildTOC(count,slide);
          me.slides.push(slide);
        }
      }
    )
  }

  me.nSlides = me.slides.length;
  if(me.nSlides==0) return false;
  clearMessage();
  me.toggleSlideStyles();
  if(!me.showAll){
    //Attach the key and mouse listeners
    if(me.keyboard && !$("#tiddlerDisplay").hasClass("noKeyboard"))
      $(document).keyup(me.keys);
    if(me.clicks){
      $(document).mouseup(me.clicker);
      document.oncontextmenu = function(){return false;}
    }
    if(me.clock) me.slideClock=setInterval(me.setClock, 1000);
    if(me.auto>0){
      me.autoAdvance=setInterval(me.next, me.auto*1000);
    }
    me.showSlide(1);
  } else {
    story.closeAllTiddlers();
    story.displayTiddlers(null,me.slides);
    $(document).keyup(me.endSlideShow);
  }

  return false;
},

buildNavigator: function() {
  //create the navigation bar
  var btns, i, nav, toc,
      slidefooter = $("#controlBar")[0]

  if(!slidefooter) return;
  $(slidefooter).addClass("slideFooterOff noClicks");
  nav = createTiddlyElement(slidefooter,"SPAN","navigator");
  btns = createTiddlyElement(nav,"SPAN","buttonBar");
  //show controls? => do show
  if(me.controls) $(slidefooter).removeClass('slideFooterOff').show();
  //otherwise toggle visibility when footer is hovered
  else $(slidefooter).bind(
    "mouseenter mouseleave",
    function(e){$(this).toggleClass("slideFooterOff");
  });

  //control buttons for the navigation
  ['firstSlide','previous','quit|endSlideShow','next','lastSlide'].map(function(id){
    id = id.split('|');
    var click = id[1] ? id[1] : id[0],
        id= id[0];
    createTiddlyButton(btns, me.text[id].label, me.text[id].tooltip, me[click], "button " + id );  
  });

  if(me.clock){
    if(me.clock == 0){
       createTiddlyElement(nav,"SPAN","slideClock");
    } else {
      createTiddlyButton(
        nav,
        " ",
        me.text.resetClock.tooltip,
        me.resetClock,
        "button",
        "slideClock"
      );
    }
    me.setClock();
  }

  createTiddlyElement(slidefooter,"SPAN","slideCounter")
    .onclick = me.toggleTOC;

  toc = createTiddlyElement(
    createTiddlyElement(document.body, 'div','toc', me.mobile ? ' mobile' : ''),
    'div'
  );

  if(me.mobile)
    createTiddlyButton(toc, me.text.quit.button, '', me.endSlideShow, "button quit");

  for(i=0; i<me.slideTOC.length; i++){
    $(toc).append(me.slideTOC[i][2]);
      $(toc.lastChild)
      .addClass("tocLevel"+me.slideTOC[i][1])
      .css("cursor", "pointer")
      .hover(
        function () {$(this).addClass("highlight");},
        function () {$(this).removeClass("highlight");}
      )
      .attr("slide",me.slideTOC[i][0])
      .click(me.showSlideFromTOC);
  }

  //input box to jump to specific slide
  $(
    createTiddlyElement(
      createTiddlyElement(toc, "DIV", "jumpItem", null, me.text.goto.label),
      "INPUT",
      "jumpInput",
      null,
      null,
      null,
      {type:'text'}
    )
  ).keyup(me.jumpToSlide);

  me.wipe('#slideHeader, #slideFooter, #controlBar');
},

//Used to shorten the TOC fields
abbreviate: function(label){
  var t, temp = new Array();
  if(label.length > me.maxTOCLength) {
    temp = label.split(' ');
    label = temp[0];
    for(t=1; t<temp.length; t++){
      if((label.length+temp[t].length)<=me.maxTOCLength){
        label += " " + temp[t];
      } else {
        label += " ...";
        break;
      }
    }
  }
  return label;
},

buildTOC: function(count,title) {
  var frag, level = 1, m, matches, txt;

  switch(me.toc){
  case "titles":
    me.slideTOC.push([
      count,
      level,
      "<div>" + me.abbreviate(title) + "</div>"
    ]);
    break;

  case "headers":
    frag = wikifyStatic(store.getTiddlerText(title));
    txt = frag.replace(/<div class="comment">.*<\/div>/mg,"");
    matches =  txt.match(/<h[123456]>.*?<\/h[123456]>/mgi);
    if(matches){
      for (m=0; m<matches.length; m++){
        level = matches[m].charAt(2);
        txt = matches[m].replace(/<\/?h[123456]>/gi,"");
        txt = me.abbreviate(txt);
        me.slideTOC.push([
          count,
          level,
          "<div>" + txt + "</div>"
        ]);
      }
    }
  }
},

showSlideFromTOC: function(e) {
  var slide = parseInt(e.target.getAttribute('slide'));
  $("#toc").hide();
  me.showSlide(slide);
  return false;
},

toggleTOC: function(){
  var $j = $("#jumpInput");
  $("#toc").toggle();
  $j.val('');
  if(!$j.closest('.mobile').length) $j.focus();
  return false;
},

jumpToSlide: function(e){
  if(e.which==13){
    var s = parseInt($("#jumpInput").val());
    if(!isNaN(s)){
      s = Math.min(s, me.nSlides);
      $("#toc").hide();
      me.showSlide( Math.max(s, 1) );
    } else  {$("#jumpInput").val('');}
  }
  return false;
},

toggleSlideStyles: function(){
  var contentWrapper = $('#contentWrapper');
  if(contentWrapper.hasClass("slideShowMode")){
    refreshPageTemplate();
    removeStyleSheet("SlideShowStyleSheet");
    if(me.theme) removeStyleSheet(me.theme);
  } else {
    $("#displayArea").prepend(
      '<div id="slideBlanker" style="display:none"></div>'+
      '<div id="slideHeader">' + me.header + '</div>'+
      '<div id="slideFooter">' + me.footer + '</div>'+
      '<div id="controlBar"></div>');
    setStylesheet(
      store.getRecursiveTiddlerText("SlideShowStyleSheet"),"SlideShowStyleSheet");
    if(me.theme && store.tiddlerExists(me.theme)){
      setStylesheet(store.getRecursiveTiddlerText(me.theme),me.theme);
    }
    me.buildNavigator();
  }
  contentWrapper.toggleClass("slideShowMode");
  return false;
},

showSlide: function(n){
  var s, contents;
  if(me.cycle) {
    if(n>me.nSlides) {
      n = 1;
    } else if(n<1) {
      n = me.nSlides;
    }
  } else {
    if(n>me.nSlides || n<1) return;
  }
  story.closeAllTiddlers();
  if(me.clock=='-'){me.resetClock();}
  s = story.displayTiddler(null,String(me.slides[n-1]));
  if(!s) s = story.getTiddler(me.slides[n-1]); //fixes bug for improperly hijacked displayTiddlers
  s.setAttribute('ondblclick', null);
  me.wipe('.tiddler');
  $("body").removeClass("slide" + me.curSlide);
  me.curSlide = n;
  $("body").addClass("slide slide"+me.curSlide);
  $("#slideCounter").text(me.curSlide+"/"+me.nSlides);
  if(me.overlays){
    var contents = $(".viewer *");
    me.numOverlays = 1;
    while(1){
      if(contents.hasClass(me.text.overlay + me.numOverlays)){
        me.numOverlays++;
      } else {break;}
    }
    me.numOverlays--;
    me.showOverlay(0);
  }
  return false;
},

showOverlay: function(n){
  var i, set;
  if(!me.overlays || me.numOverlays == 0 || n<0 || n>me.numOverlays){return;}
  for(i=1; i<n; i++){
    set = $(".viewer "+"."+me.text.overlay + i);
    set.removeClass("currentOverlay nextOverlay");
    set.addClass("previousOverlay");
  }
  set = $(".viewer "+"."+me.text.overlay + n);
  set.removeClass("previousOverlay nextOverlay");
  set.addClass("currentOverlay");
  for(i=n; i<me.numOverlays; i++){
    set = $(".viewer "+"."+me.text.overlay + (i+1));
    set.removeClass("previousOverlay currentOverlay");
    set.addClass("nextOverlay");
  }
  me.curOverlay = n;
},

firstSlide: function(){
  me.showSlide(1);
  return false;
},

lastSlide: function(){
  me.showSlide(me.nSlides);
  return false;
},

next: function(){
  if(!me.overlays || me.numOverlays == 0 || me.curOverlay == me.numOverlays) {
    me.showSlide(me.curSlide+1);
  } else {
    me.showOverlay(me.curOverlay+1);
  }
  return false;
},

previous: function(){
  if(!me.overlays || me.numOverlays == 0 || me.curOverlay == 0) {
    me.showSlide(me.curSlide-1);
    me.showOverlay(me.numOverlays);
  } else {
    me.showOverlay(me.curOverlay-1);
  }
  return false;
},

endSlideShow: function(){
  if(me.autoAdvance) {clearInterval(me.autoAdvance);}
  if(me.clock) clearInterval(me.slideClock);
  $('#toc').remove();
  story.closeAllTiddlers();
  me.toggleSlideStyles();
  story.displayTiddlers(null,me.openTiddlers);
  $('body').removeClass('slide slide' + me.curSlide);
  document.oncontextmenu =  function(){};
  $(document).unbind();

  return false;
},

// 'keys' code adapted from S5 as adapted from http://mozpoint.mozdev.org
keys: function(key) {
  if(key.which == 27){ //ESC
    me.endSlideShow();
  
  }else if (key.which == 66){ //B
    $("#slideBlanker").toggle();
    me.blocked = (me.blocked +1)%2;

  }else if(0 == me.blocked){
    switch(key.which) {
      case 32: // spacebar
        if(me.auto>0){
          if(me.autoAdvance){
            clearInterval(me.autoAdvance);
            me.autoAdvance = null;
          } else {
            me.autoAdvance=setInterval(me.next, me.auto*1000);
          }
        } else {
          me.next();
        }
        break;
      case 33: // page up
         me.showSlide(me.curSlide-1);
        break;
      case 34: // page down
        me.showSlide(me.curSlide+1);
        break;
      case 35: // end
        me.lastSlide();
        break;
      case 36: // home
        me.firstSlide();
        break;
      case 37: // left
        me.previous();
        break;
      case 38: // up
        me.showOverlay(0);
        break;
      case 39: // right
        me.next();
        break;
      case 40: // down
        me.showOverlay(me.numOverlays);
        break;
      }
    }
  return false;
},

clicker: function(e) {
  if(
    me.blocked == 1 ||
    $(e.target).attr('href') ||
    $(e.target).is('input') ||
    $(e.target).parents().andSelf().hasClass('noClicks')
  ) return true;

  if($("#toc").is(':visible')){
    me.toggleTOC();
  } else {
    if((!e.which && e.button == 1) || e.which == 1) {
      me.next();
    }
    if((!e.which && e.button == 2) || e.which == 3) {
      me.previous();
    }
  }
  return false;
},

setClock: function(){
  var now = new Date(),
    time = now.getTime() - me.clockStartTime;

  time =
    me.clockMultiplier * time +
    me.clockInterval +
    me.clockCorrection;

  now.setTime(time);
  time = now.formatString(me.clockFormat);
  $("#slideClock").text(time);
  return false;
},

resetClock: function(){
  var t,s;
  if(me.clock == 0) return;
  t = new Date(0);
  if(me.clockStartTime > t){
    s = new Date();
    me.clockStartTime = s.getTime();
  }
  return false;
},

wipe : function(el){
  if( $.fn.touchwipe ) {
    $(el).touchwipe({
      wipeLeft: me.next,
      wipeRight: me.previous,
      wipeUp: me.firstSlide,
      wipeDown: me.lastSlide
    });
  }
}
}

config.formatters.push( {
  name: "SlideSeparator",
  match: "^" + me.separator + "+$\\n?",
  handler: function(w) {
    createTiddlyElement(w.output,"hr",null,'slideSeparator');
  }
});

config.shadowTiddlers.SlideShowStyleSheet = [
"/*{{{*/",
".header, #mainMenu, #sidebar,",
"#backstageButton, #backstageArea,",
".toolbar, .title, .subtitle,",
".tagging, .tagged, .tagClear, .comment{",
" display:none !important",
"}\n",
"#slideBlanker{",
" position: absolute;",
" top: 0;",
" left: 0;",
" width: 100%;",
" height: 100%;",
" z-index: 90;",
" background-color: #000;",
" opacity: 0.9;",
" filter: alpha(opacity=90)",
"}\n",
".nextOverlay{",
" visibility: hidden",
"}\n",
".previousOverlay,.currentOverlay{",
" visibility: visible",
"}\n",
"#displayArea{",
" font-size: 250%;",
" margin: 0 !important;",
" padding: 0",
"}\n",
"#controlBar{",
" position: fixed;",
" bottom: 2px;",
" right: 0.5em;",
" width: 100%;",
" text-align: right",
"}\n",
"#controlBar .button{",
" margin: 0 0.25em;",
" padding: 0 0.25em",
"}\n",
"",
"#slideHeader{",
" font-size: 200%;",
" font-weight: bold",
"}\n",
"#slideFooter{",
" position: fixed;",
" bottom: 2px",
"}\n",
".slideFooterOff #navigator{",
" visibility: hidden",
"}\n",
"#slideClock{",
" margin: 0 5px 0 5px",
"}\n",
"#slideCounter{",
" cursor: pointer;",
" color: #aaa",
"}\n",
"#toc{",
" display: none;",
" position: fixed;",
" top: 1em;",
" bottom: 3em;",
" right: 0.5em;",
" font-size: 2em;",
" text-align: left;",
"}\n",
"#toc > div {",
" position:absolute;",
" right:0;",
" bottom:0;",
" padding: 5px;",
" overflow: auto;",
" max-height: 95%;",
" min-width: 300px;",
" background: [[ColorPalette::Background]];",
" border: 1px solid [[ColorPalette::TertiaryMid]];",
"}\n",
"#toc .quit{",
" display:block;",
" margin-bottom:7px;",
"}\n",
"#toc.mobile{",
" font-size: 4em;",
"}\n",
"#jumpItem{",
" padding-left:0.25em;",
" margin-top:7px;",
"}\n",
"#jumpInput{",
" margin-left: 0.25em;",
" width: 3em",
"}\n",
".tocLevel1{",
" font-size: .8em",
"}\n",
".tocLevel2{",
" margin-left: 1em;",
" font-size: .75em",
"}\n",
".tocLevel3{",
" margin-left: 2em;",
" font-size: .7em",
"}\n",
".tocLevel4{",
" margin-left: 3em;",
" font-size: .65em",
"}\n",
".tocLevel5{",
" margin-left: 4em;",
" font-size: .6em",
"}\n",
".tocLevel6{",
" margin-left: 5em;",
" font-size: .55em",
"}\n",
".slide .tiddler{",
" height:100%;",
"}\n",
"/*}}}*/"].join('\n');

config.shadowTiddlers.SlideShowPluginDoc =
"[[SlideShowPlugin Documentation|http://www.math.ist.utl.pt/~psoares/addons.html#SlideShowPluginDoc]]";
}

})(jQuery)
//}}}