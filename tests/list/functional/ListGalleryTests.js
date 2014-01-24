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
		},
		"selectionMode 'none'": function () {
			var remote = this.remote;
			var listId = "list-mark-3";
			return remote
			.get(require.toUrl("./ListGallery.html"))
			.waitForCondition("ready", 5000)
			.then(function () {
				remote
				.execute("document.getElementById('" + listId + "').scrollIntoView();")
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[3]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.end();
			});
		},
		"selectionMode 'multiple'": function () {
			var remote = this.remote;
			var listId = "list-mark-1";
			return remote
			.get(require.toUrl("./ListGallery.html"))
			.waitForCondition("ready", 5000)
			.then(function () {
				remote
				.execute("document.getElementById('" + listId + "').scrollIntoView();")
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[3]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.end()
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[4]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.end()
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[3]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.end();
			});
		},
		"selectionMode 'single'": function () {
			var remote = this.remote;
			var listId = "list-mark-2";
			return remote
			.get(require.toUrl("./ListGallery.html"))
			.waitForCondition("ready", 5000)
			.then(function () {
				remote
				.execute("document.getElementById('" + listId + "').scrollIntoView();")
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[3]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.end()
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[4]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.click()
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item d-selected");
					})
					.end()
				.elementByXPath("//*[@id='" + listId + "']//d-list-item[3]")
					.getAttribute("className")
					.then(function (className) {
						assert.equal(className, "d-list-item");
					})
					.end();
			});
		}
	});
});