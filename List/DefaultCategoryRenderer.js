define(["dcl/dcl",
        "delite/register",
        "./CategoryRendererBase"
], function (dcl, register, CategoryRendererBase) {
	
	var DefaultCategoryRenderer = dcl([CategoryRendererBase], {

		baseClass: "d-list-category",

		renderCategory: function (category) {
			this.innerHTML = category;
		}

	});

	return register("d-list-category", [HTMLElement, DefaultCategoryRenderer]);
});