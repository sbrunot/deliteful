define([
	"dcl/dcl",
	"dojo/keys"
], function (dcl, keys) {

	// module:
	//		deliteful/StarRating/bidi/StarRating

	return dcl(null, {
		// summary:
		//		Bidi support for StarRating widget.
		// description:
		//		Implementation for RTL and LTR direction support.
		//		This class should not be used directly.
		//		StarRating widget loads this module when user sets "has: {'dojo-bidi': true }" in data-dojo-config.

		startup: function () {
			if (!this.isLeftToRight()) {
				this._incrementKeyCodes = [keys.LEFT_ARROW, keys.UP_ARROW, keys.NUMPAD_PLUS];
				this._decrementKeyCodes = [keys.RIGHT_ARROW, keys.DOWN_ARROW, keys.NUMPAD_MINUS];
			}
		},

		buildRendering: dcl.superCall(function (sup) {
			return function () {
	            sup.apply(this, arguments);
				if (!this.isLeftToRight()) {
					this.dir = "rtl";
				}
			};
		})
	});
});
