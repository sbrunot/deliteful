define([
	"intern!object",
	"intern/chai!assert",
	"dojo/when",
	"delite/register",
	"deliteful/list/List",
	"deliteful/list/Pageable"
], function (registerSuite, assert, when, register, List, Pageable) {

	register("p-list", [List, Pageable]);
	var list = null;

	var clickPageLoader = function (hint, dfd, next, expectedItemsCount, expectedFirstItemIndex,
			expectedNextPageLoaderLabel, expectedPreviousPageLoaderLabel, nextAction) {
		var children = list.getChildren();
		var pageLoader = next ? children[children.length - 1] : children[0];
		when(pageLoader._clickHandler(), function () {
			try {
				var totalCount = expectedItemsCount
								+ (expectedNextPageLoaderLabel ? 1 : 0)
								+ (expectedPreviousPageLoaderLabel ? 1 : 0);
				children = list.getChildren();
				assert.equal(children.length, totalCount,
						"nb of children " + hint);
				if (expectedPreviousPageLoaderLabel) {
					assert.equal(children[0].textContent,
							expectedPreviousPageLoaderLabel,
							"previous page loader " + hint);
				}
				if (expectedNextPageLoaderLabel) {
					assert.equal(children[totalCount - 1].textContent,
							expectedNextPageLoaderLabel,
							"next page loader " + hint);
				}
				var correction = expectedPreviousPageLoaderLabel ? 1 : 0;
				for (var i = correction; i < totalCount - (expectedNextPageLoaderLabel ? 1 : 0); i++) {
					assert.equal(children[i].textContent,
							"item " + (i + expectedFirstItemIndex - correction),
							"text for node " + (i + expectedFirstItemIndex - correction) + " " + hint);
				}
				nextAction.call();
			} catch (error) {
				dfd.reject(error);
			}
		}, function (error) {
			dfd.reject(error);
		});
	};

	registerSuite({
		name: "list/Pageable",
		beforeEach: function () {
			var i;
			if (list) {
				list.destroy();
			}
			list = register.createElement("p-list");
			for (i = 0; i < 80; i++) {
				list.store.add({label: "item " + i});
			}
			list.style.height = "200px";
			list.pageLength = 20;
			list.maxPages = 2;
			list.startup();
		},
		"paging with default store" : function () {
			// TODO: TEST FOCUSED NODE !!!
			var dfd = this.async(1000);
			document.body.appendChild(list);
			var children = list.getChildren(), i;
			assert.equal(children.length, 20 + 1 /*items + next page loader*/, "initial nb of children");
			for (i = 0; i < 20; i++) {
				assert.equal(children[i].textContent, "item " + i, "text for node " + i);
			}
			var nextPageLoader = children[20];
			assert.equal(nextPageLoader.textContent, "Click to load 20 more items");
			
			clickPageLoader("first click on next page loader",
				dfd,
				true,
				40,
				0,
				"Click to load 20 more items",
				null,
				function () {
					clickPageLoader("second click on next page loader",
						dfd,
						true,
						40,
						20,
						"Click to load 20 more items",
						"Click to load 20 more items",
						function () {
							clickPageLoader("third click on next page loader",
								dfd,
								true,
								40,
								40,
								"Click to load 20 more items",
								"Click to load 20 more items",
								function () {
									clickPageLoader("fourth click on next page loader",
										dfd,
										true,
										20,
										60,
										null,
										"Click to load 20 more items",
										function () {
											clickPageLoader("firth click on previous page loader",
												dfd,
												false,
												40,
												40,
												null,
												"Click to load 20 more items",
												function () {
													clickPageLoader("second click on previous page loader",
														dfd,
														false,
														40,
														20,
														"Click to load 20 more items",
														"Click to load 20 more items",
														function () {
															clickPageLoader("third click on previous page loader",
																dfd,
																false,
																40,
																0,
																"Click to load 20 more items",
																null,
																function () {
																	dfd.resolve();
																}
															);
														}
													);
												}
											);
										}
									);
								}
							);
						}
					);
				}
			);
			return dfd;
		},
		teardown : function () {
			list.destroy();
			list = null;
		}
	});
});
