define(["dcl/dcl",
        "dojo/dom-class",
        "dojo/dom-construct",
        "delite/Widget"
], function (dcl, domClass, domConstruct, Widget) {

	return dcl([Widget], {

		// The category to render
		category: "",
		_setCategoryAttr: function (value) {
			this._set("category", value);
			this.renderCategory(value);
		},

		buildRendering: function () {
			this.style.display = "block";
			this._isCategoryRenderer = true;
		},

		// Method that render the category in the widget GUI
		/*jshint unused:false */
		renderCategory: function (category) {
			// abstract method
		},

	});
});