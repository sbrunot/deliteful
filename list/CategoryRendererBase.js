define(["dcl/dcl",
        "dojo/dom-class",
        "dojo/dom-construct",
        "delite/Widget"
], function (dcl, domClass, domConstruct, Widget) {

	// module:
	//		deliteful/list/CategoryRendererBase

	return dcl([Widget], {
		// summary:
		//		Base class for a widget that render a category inside a deliteful/list/List widget.
		//
		// description:
		//		This base class provide all the infrastructure that a deliteful/list/List widget
		//		expect from a category renderer.
		//
		//		A concrete category renderer must extend this class an implement its render method
		//		to render the category inside the container node of the widget (this.containerNode).

		// category: String
		//		the category to render.
		category: "",
		_setCategoryAttr: function (value) {
			this._set("category", value);
			this.render(value);
		},

		// baseClass: [protected] String
		//		CSS class of a category renderer. This value is expected by the deliteful/list/List widget
		//		so it must not be changed.
		baseClass: "d-list-category",

		//////////// PROTECTED METHODS ///////////////////////////////////////

		/* jshint unused:vars */
		render: function (/*String*/category) {
			// summary:
			//		This method must be implemented by the category renderer concrete class.
			//		It should render the category inside the renderer container node
			//		(this.containerNode). It is called every time that the category attribute
			//		of the renderer is assigned to a value, and might be called more than once
			//		during the List life cycle, with a different category value each time.
			// category: String
			//		The category to render.
			// tags:
			//		protected extension
		},

		buildRendering: function () {
			// summary:
			//		Create the widget container node, into which a category will be rendered.
			// tags:
			//		protected
			this.containerNode = this;
			this.style.display = "block";
			this._isCategoryRenderer = true; // used by List to identify category renderers
			// Aria attributes
			this.setAttribute("role", "listitem");
		}

	});
});