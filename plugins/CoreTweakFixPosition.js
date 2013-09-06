/***
|''Name''|CoreTweakFixPosition|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|fixes scrolling and positioning of popups and tiddlers|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/CoreTweakFixPosition.js|
|''Documentation''|http://talk.tiddlyspace.com|
|''Version''|0.2 2013-09-03|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
Fixes...
* false positioning of popups when anchor in a fixed element
* no more scrolling to popups but to anchors!
*fixes scrolling to top of tiddler taking the header into account
!Code
***/
/*{{{*/

(function($){
config.options.txtOffsetScrollTop = '20';
config.options.txtHeaderElement = '.header';
window.ensureVisible = function(e) {
  var $el = $(config.options.txtHeaderElement),
    distance = $el.length ? $el.height() : 0;
  return (jQuery(e).offset().top - distance + parseInt(config.options.txtOffsetScrollTop));
}

window.findPosX = function(obj){ return ($(obj).offset()).left;}
window.findPosY = function(obj){ return ($(obj).offset()).top;}

Popup.show = function(valign,halign,offset) {
  var curr = Popup.stack[Popup.stack.length-1];
  this.place(curr.root,curr.popup,valign,halign,offset);
  $el = $(curr.root);
  $page = $('#displayArea');
  $el.addClass("highlight");
  if(config.options.chkAnimate && anim && typeof Scroller == "function")
    $page.animate({
          scrollTop:
              $el.offset().top -
              $page.offset().top
    });
  else
    window.scrollTo(0,$el.offset().top - $page.offset().top);
};
})(jQuery);
/*}}}*/