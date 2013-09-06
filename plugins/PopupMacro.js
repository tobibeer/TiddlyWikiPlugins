/***
|''Name:''|~PopupMacro|
|''Author:''|Saq Imtiaz (mod: Tobias Beer)|
|''Documentation:''|http://tobibeer.tiddlyspace.com/#PopupMacroMod|
|''Version:''|1.3.1 TB (2013-09-05)|
|''Description:''|Create popups with custom content|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PopupMacro.js|
|''Requires:''|TW Version 2.5.3 or better|
!Code
***/
//{{{
//PARAMETERS
config.macros.popup = {
    hover: true,
    hideAfter: 700,
    showAfter: 200,
    fadeTime: 300,
    err1: 'missing macro parameters',
    err2: 'missing label or content parameter',
    arrow: document.all ? " ▼" : " ▾",

    //DO NOT CHANGE
    handler: function (place, macroName, params, wikifier, paramString, theTiddler) {
        var btn, lbl, src, delay, show,
            p = paramString.parseParams(null, null, true),
            id = getParam(p, 'id', 'nestedpopup'),
            cls = 'popup popupmacro' + getParam(p, 'class', ''),
            arr = getParam(p, 'arrow', this.arrow),
            hover = (params.contains('hover') || this.hover) && (!params.contains('nohover') || !this.hover),
            btnId = 'btn' + (new Date()).formatString('YYYYMMDDhhmmss') + Math.random().toString().substr(6);

        if (!params[0] || !params[1]) { createTiddlyError(place, this.err1, this.err2); return false; }
        lbl = params[0];
        src = (params[1]).replace(/\$\)\)/g, ">>");

        btn = createTiddlyButton(
            place,
            lbl + arr,
            lbl,
            this.show,
            'button popupbutton',
            btnId,
            null,
            {
                open: 'true',
                popupclass: cls,
                content: src
            }
        );
        btn.setAttribute('popupid', !isNested(btn) ? id : 'popup');
        btn.click = this.click;
        btn.onmouseover = hover ? (this.showAfter ? this.delay : this.show) : null;
        btn.onmouseout = hover && this.showAfter ? this.abort : null;
    },
    close: function (p) {
        if (p.getAttribute('close') == 'ok') {
            //jQuery(p).fadeOut(this.fadeTime);
            //setTimeout(Popup.remove(),this.fadeTime);
        }
    },
    mouseout: function () {
        var cmp = config.macros.popup, p = this;
        p.setAttribute('close', 'ok');
        setTimeout(function () { cmp.close(p); }, cmp.hideAfter);
    },
    mouseover: function () {
        this.setAttribute('close', '');
    },
    delay: function (e) {
        var btn = this, cmp = config.macros.popup;
        btn.setAttribute('abort', '');
        setTimeout(function () { cmp.show(btn); }, cmp.showAfter);
    },
    abort: function (e) {
        var cmp = config.macros.popup;
        this.setAttribute('abort', 'true');
        var p = document.getElementById(this.getAttribute('popupid'));
        if (p) {
            p.setAttribute('close', 'ok');
            setTimeout(function () { cmp.close(p); }, cmp.hideAfter);
        }
    },
    click: function(e){
        var btn = resolveTarget(e || window.event);
        btn.setAttribute('open',true);
        this.show(btn);
        btn.setAttribute('open',false);        
    },
    show: function (e) {
        e = e || window.event;
        var open, nest, p, tgt, cmp = config.macros.popup,
            btn = this.innerHTML ? this : e,
            btnId = btn.getAttribute('id'),
            id = btn.getAttribute('popupid'),
            cls = btn.getAttribute('popupclass'),
            src = btn.getAttribute('content');

        if (btn.getAttribute('abort') == 'true') return;
        open = btn.getAttribute('open') == 'true';
        btn.setAttribute('open', !open);
        if (open) {
            tgt = this.innerHTML ? resolveTarget(e || window.event) : btn;
            if (nest && Popup.stack.length > 1) Popup.removeFrom(1);
            else if (!nest && Popup.stack.length > 0) Popup.removeFrom(0);
            p = createTiddlyElement(document.body, "ol", id, cls, null);
            p.onmouseover = cmp.mouseover;
            p.onmouseout = cmp.mouseout;
            Popup.resetButtonShow();
            Popup.showButtonId = btnId;
            Popup.stack.push({ root: btn, popup: p });
            wikify(src, p);
            Popup.show(p, true);
            if (e) {
                e.cancelBubble = true;
                if (e.stopPropagation) e.stopPropagation();
            }
            return false;
        }
    }
}

window.isNested = function (el) {
    var c = document.getElementById("contentWrapper");
    while (el != null) { if (el == c) return true; el = el.parentNode; } return false;
}

Popup.resetButtonShow = function () {
    var btn = document.getElementById(Popup.showButtonId);
    if (btn) {
        btn.setAttribute('open', 'true');
        Popup.showButtonId = '';
    }
}

if (!Popup.macroRemove) Popup.macroRemove = Popup.remove;
Popup.remove = function (pos) {
    Popup.resetButtonShow();
    Popup.macroRemove.apply(this, arguments);
};

setStylesheet('#nestedpopup {margin-left:1em;}.popupbutton{cursor:pointer};', 'PopupMacroStyles');
//}}}