define([
	"intern!object",
	"intern/chai!assert",
	"deliteful/list/List"
], function (registerSuite, assert, List) {

	var list = null;

	var checkCategory = function (node, expectedCategory) {
		assert.equal(node.tagName, "D-LIST-CATEGORY");
		assert.equal(node.className, "d-list-category");
		assert.equal(node.innerHTML, expectedCategory);
	};

	var checkItem = function (node, expectedLabel) {
		assert.equal(node.tagName, "D-LIST-ITEM");
		assert.equal(node.className, "d-list-item");
		assert.equal(node.getElementsByClassName('d-list-item-label')[0].innerHTML, expectedLabel);
	};

	registerSuite({
		name: "list/Categories",
		beforeEach: function () {
			if (list) {
				list.destroy();
			}
			list = new List();
			list.startup();
			list.store.query();
			list.categoryAttribute = "category";
			list.store.add({category: "A", label: "item 1"});
			list.store.add({category: "A", label: "item 2"});
			list.store.add({category: "A", label: "item 3"});
			list.store.add({category: "B", label: "item 4"});
			list.store.add({category: "B", label: "item 5"});
			list.store.add({category: "B", label: "item 6"});
			list.store.add({category: "C", label: "item 7"});
			list.store.add({category: "C", label: "item 8"});
			list.store.add({category: "C", label: "item 9"});
		},
		"categorized items" : function () {
			var children = list.getChildren();
			assert.equal(children.length, 12);
			checkCategory(children[0], "A");
			checkItem(children[1], "item 1");
			checkItem(children[2], "item 2");
			checkItem(children[3], "item 3");
			checkCategory(children[4], "B");
			checkItem(children[5], "item 4");
			checkItem(children[6], "item 5");
			checkItem(children[7], "item 6");
			checkCategory(children[8], "C");
			checkItem(children[9], "item 7");
			checkItem(children[10], "item 8");
			checkItem(children[11], "item 9");
		},
		"remove all items from category (top and bottom of list)" : function () {
			// remove the three first items
			list.store.remove(list.store.data[0].id);
			list.store.remove(list.store.data[0].id);
			list.store.remove(list.store.data[0].id);
			var children = list.getChildren();
			assert.equal(children.length, 8);
			checkCategory(children[0], "B");
			checkItem(children[1], "item 4");
			checkItem(children[2], "item 5");
			checkItem(children[3], "item 6");
			checkCategory(children[4], "C");
			checkItem(children[5], "item 7");
			checkItem(children[6], "item 8");
			checkItem(children[7], "item 9");
			// remove the three last items
			list.store.remove(list.store.data[list.store.data.length - 1].id);
			list.store.remove(list.store.data[list.store.data.length - 1].id);
			list.store.remove(list.store.data[list.store.data.length - 1].id);
			children = list.getChildren();
			assert.equal(children.length, 4);
			checkCategory(children[0], "B");
			checkItem(children[1], "item 4");
			checkItem(children[2], "item 5");
			checkItem(children[3], "item 6");
			// remove two items
			list.store.remove(list.store.data[0].id);
			list.store.remove(list.store.data[0].id);
			children = list.getChildren();
			assert.equal(children.length, 2);
			checkCategory(children[0], "B");
			checkItem(children[1], "item 6");
			// remove the last item
			list.store.remove(list.store.data[0].id);
			children = list.getChildren();
			assert.equal(children.length, 0);
		},
		"remove all items from category (middle of list)" : function () {
			// remove the three items in the middle
			list.store.remove(list.store.data[3].id);
			list.store.remove(list.store.data[3].id);
			list.store.remove(list.store.data[3].id);
			var children = list.getChildren();
			assert.equal(children.length, 8);
			checkCategory(children[0], "A");
			checkItem(children[1], "item 1");
			checkItem(children[2], "item 2");
			checkItem(children[3], "item 3");
			checkCategory(children[4], "C");
			checkItem(children[5], "item 7");
			checkItem(children[6], "item 8");
			checkItem(children[7], "item 9");
		},
		teardown : function () {
			list.destroy();
			list = null;
		}
	});
});
