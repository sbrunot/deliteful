define(["dcl/dcl",
        "delite/register",
        "./CategoryRendererBase"
], function (dcl, register, CategoryRendererBase) {
	
	// module:
	//		deliteful/List/DefaultCategoryRenderer

	var DefaultCategoryRenderer = dcl([CategoryRendererBase], {
		// summary:
		//		Default category renderer for the deliteful/List widget.
		//

		//////////// PROTECTED METHODS ///////////////////////////////////////

		render: function (category) {
			// summary:
			//		render the category.
			// item: Object
			//		The category to render.
			// tags:
			//		protected
			this.innerHTML = category;
		}

	});

	return register("d-list-category", [HTMLElement, DefaultCategoryRenderer]);
});