define([
	"intern!object",
	"intern/chai!assert",
	"deliteful/list/List"
], function (registerSuite, assert, List) {

	var list = null;

	registerSuite({
		name: "list/List",
		beforeEach: function () {
			if (list) {
				list.destroy();
			}
			list = new List();
			list.startup();
			list.store.add({label: "item 1"});
			list.store.add({label: "item 2"});
			list.store.add({label: "item 3"});
		},
		"baseClass update" : function () {
			var dfd = this.async(1000);
			list.initItems = dfd.callback(function () {
				list._setBusy(false);
				assert.equal(list.className, "d-list");
				list.baseClass = "d-round-rect-list";
				assert.equal(list.className, "d-round-rect-list");
				list.baseClass = "d-list";
				assert.equal(list.className, "d-list");
			});
			return dfd;
		},
		"scrollDisabled and scroll direction" : function () {
			assert.equal(list.scrollDirection, "vertical", "intial scroll direction");
			list.scrollDisabled = true;
			assert.equal(list.scrollDirection, "none", "scroll direction after disabling scroll");
			list.scrollDisabled = false;
			assert.equal(list.scrollDirection, "vertical", "scroll direction after re enabling scroll");
		},
		teardown : function () {
			list.destroy();
			list = null;
		}
	});
});
