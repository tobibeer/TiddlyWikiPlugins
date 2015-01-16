/***
|''Name:''|FieldClassesPlugin|
|''Description:''|adds classes to each tiddler for each field|
|''Documentation''|http://fieldclassesplugin.tiddlyspace.com|
|''Version:''|0.1.0|
|''Date:''|2015.01.16|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/DiscussPlugin.js|
|''Author:''|Tobias Beer|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.5.3|

A tiddler with the custom fields ''foo'' and ''bar'' will get the classes ''tiddler field-foo field-bar''.
***/
/*{{{*/
(function($){
story.createTiddler_FIELDCLASSES = story.createTiddler;
story.createTiddler = function (place,before,title,template,customFields) {
    var tiddlerElem = story.createTiddler_FIELDCLASSES.apply(this,arguments),
        tiddler = store.getTiddler(title);
    if(tiddler && tiddlerElem){
        console.log(tiddler.fields);
        $.each(tiddler.fields, function(field){$(tiddlerElem).addClass('field-'+field);});
    }
    return tiddlerElem;
}
})(jQuery);
/*}}}*/