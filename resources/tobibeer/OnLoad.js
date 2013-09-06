<script>
(function($){
	var
		$tid = $(place).closest('.tiddler'),
		$v = $tid.find('.viewer'),
		tid = store.getTiddler($tid.attr('tiddler')),
		run = $tid.attr('runOnce');

	if(run)return;
	else $tid.attr('runOnce',true);

	if(!tid)return;

	if(tid.tags && tid.tags.contains('no-tagging')){
	    $('.infoTagging',$tid).hide();
	}

	if(tid.tags && tid.tags.contains('no-tags')){
	    $('.infoTags',$tid).hide();
	}
	
	if(tid.tags && tid.tags.contains('follow')){
		wikify(
			'{{followersFollowers{\n!This users followers...\n'+
			'<<followers "' + tid.title + '" fat:n sort:server.bag hide:tobibeer>>}}}',
			( $('<div/>').appendTo($v) )[0]
		)
	}

	if(tid.tags && tid.tags.containsAny(['Talks','WhatOthersSay'])){
		wikify(
			'{{tbScan{\n!What everyone says right now...\n'+
			'<<tsScan "' + tid.title + '" fat:y template:Templates##TALK sort:server.bag hide:tobibeer>>\n}}}',
			( $('<div/>').appendTo($v) )[0]
		)
	}
})(jQuery)
</script>