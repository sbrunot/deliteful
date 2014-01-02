define(["dcl/dcl",
        "delite/register",
        "./AbstractCategoryRenderer"
], function (dcl, register, AbstractCategoryRenderer) {
	
	var DefaultCategoryRenderer = dcl([AbstractCategoryRenderer], {

		baseClass: "d-list-category",

		renderCategory: function (category) {
			this.innerHTML = category;
		}

	});

	return register("d-list-category", [HTMLElement, DefaultCategoryRenderer]);
});