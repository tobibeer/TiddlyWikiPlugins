/***
|''Name''|MessageFadeOut|
|''Description''|automatically hides messages after 5 seconds|
|''Author''|Tobias Beer|
|''Version''|1.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/MessageFadeOut.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
***/
//{{{
config.options.txtFadeTimer = 5000; // 5 seconds 
var displayMessageFADEOUT = displayMessage;
displayMessage = function (text, linkText) {
    displayMessageFADEOUT.apply(this, arguments);
    ti = config.options.txtFadeTimer;
    if (ti > 0) setTimeout(clearMessage, ti);
}
//}}}