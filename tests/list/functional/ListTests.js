define(["intern!object",
        "intern/chai!assert",
        "require"
        ], function (registerSuite, assert, require) {
	
	console.log("# Registering list/List tests");
	registerSuite({
		name: "StarRating tests",
		"Programmatic: Default store, items added before adding the list to the document and before startup": function () {
			var remote = this.remote;
			var listId = "list-prog-1";
			return remote
			.get(require.toUrl("./ListGallery.html"))
			.waitForCondition("ready", 5000)
			.then(function () {
				remote
				.elementById(listId)
					.elementsByTagName("d-list-item")
					.then( function (result) {
						assert.equal(result.length, 100, "number of list items is not the expected one");
						// TODO: check the label on each item
					})
					.end()
					.elementsByTagName("d-category-item")
					.then( function(result) {
						assert.equal(result.length, 0, "number of category headers is not the expected one");
					})
					.end()
					// TODO: scroll ?
				.end();
			})
		},
	});
});