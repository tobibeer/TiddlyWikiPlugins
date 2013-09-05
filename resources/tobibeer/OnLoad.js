<script>
(function($){
	$tid = $(place).closest('.tiddler');
	tid = store.getTiddler($tid.attr('tiddler'));

	if(!tid)return;

	if(tid.tags && tid.tags.contains('no-tagging')){
	    $('.infoTagging',$tid).hide();
	}

	if(tid.tags && tid.tags.contains('no-tags')){
	    $('.infoTags',$tid).hide();
	}
})(jQuery)
</script>