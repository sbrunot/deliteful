define(["intern!object",
        "intern/chai!assert",
        "require"
        ], function (registerSuite, assert, require) {

	var basicTest = function (remote, testPage, listId, numberOfItemsExpected, numberOfCategoriesExpected) {
		return remote
		.get(require.toUrl(testPage))
		.waitForCondition("ready", 5000)
		.then(function () {
			return remote
			.elementById(listId)
				.elementsByTagName("d-list-item")
					.then(function (result) {
						assert.equal(result.length, numberOfItemsExpected,
								listId + " number of list items is not the expected one");
						// TODO: check the label on each item
					})
				.elementsByTagName("d-list-category")
					.then(function (result) {
						assert.equal(result.length, numberOfCategoriesExpected,
								listId + " number of category headers is not the expected one");
					})
					// TODO: scroll ?
				.end();
		});
	};

	registerSuite({
		name: "StarRating tests",
		"ListGallery.html / list-prog-1": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-prog-1", 100, 0);
		},
		"ListGallery.html / list-prog-2": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-prog-2", 100, 0);
		},
		"ListGallery.html / list-prog-3": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-prog-3", 100, 0);
		},
		"ListGallery.html / list-prog-4": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-prog-4", 100, 0);
		},
		"ListGallery.html / list-mark-1": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-mark-1", 10, 0);
		},
		"ListGallery.html / list-mark-2": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-mark-2", 10, 0);
		},
		"ListGallery.html / list-mark-3": function () {
			return basicTest(this.remote, "./ListGallery.html", "list-mark-3", 10, 2);
		}
	});
});