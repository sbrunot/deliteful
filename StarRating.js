define([
    "dcl/dcl",
	"dojo/_base/lang",
	"dojo/string",
	"dojo/has",
	"dojo/keys",
	"dojo/dom-construct",
	"dojo/dom-class",
	"delite/register",
	"delite/Widget",
	"delite/Invalidating",
	"dojo/has!dojo-bidi?./StarRating/bidi/StarRating",
	"dojo/i18n!./StarRating/nls/StarRating",
	"delite/themes/load!./StarRating/themes/{{theme}}/StarRating_css",
	"dojo/has!dojo-bidi?delite/themes/load!./StarRating/themes/{{theme}}/StarRating_rtl_css"
], function (dcl, lang, string, has, keys, domConstruct, domClass,
			register, Widget, Invalidating, BidiStarRating, messages) {

	// module:
	//		deliteful/StarRating
	var StarRating = dcl([Widget, Invalidating], {
		// summary:
		//		A widget that displays a rating, usually with stars, and that allows setting a different rating value
		//		by touching the stars.
		// description:
		//		This widget shows the rating using an image sprite that contains a full star and an empty star.
		//		When the widget is disabled, it uses an alternate image sprite that also contains a full star.
		//		The sprite that the widget use to display stars when it is not in the disabled states has the following
		//		properties:
		//		- its height is the height of a star, its width is twice the width of a star
		//		- in its left half, it displays a full star
		//		- in its right half, it displays an empty star
		//		The default sprite that the widget use can be found at TODO: ADD A LINK HERE
		//		The sprite that the widget use to display stars when it is in the disabled states has the following
		//		properties:
		//		- it has the same size than the previous sprite
		//		- in its left half, it displays a disabled full star
		//		- in its right half, it displays a disabled empty star
		//		The default sprite that the widget use can be found at TODO: ADD A LINK HERE
		//		To use custom sprites for the widget, the following css rules must be added to the stylesheet of
		//		the application:
		//		- .d-star-rating > div {
		//				width: half_star_width;
		//				height: star_height;
		//				background-image: url("path/to/your/custom/image/for/enabled/widget");
		//				}
		//		- .d-star-rating[disabled] > div {
		//				background-image: url("path/to/your/custom/image/for/disabled/widget");
		//				}
		//		- TO BE CONTINUED (ALMOST ALL THE CSS RULES MUST BE REDEFINED WHEN USING A CUSTOM STAR IMAGE IF IT DOES NOT HAVE THE SAME
		//		  SIZE THAN THE DEFAULT ONE !!!!)
		//		Note that if your using a different baseClass than the default one "d-star-rating",
		//		you should replace 'd-star-rating' in the previous css rules with your
		//		baseClass value.
		//
		//		The widget can be used in read-only or in editable mode. In editable mode, it allows
		//		to set half values or not using the editHalfValues property, and allows to set the value zero or not using
		//		the editZero property.
		//
		//		This widget supports right to left direction.

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "d-star-rating",

		// max: Number
		//		The maximum rating, that is also the number of stars to show.
		max: 5,

		// value: Number
		//		The current value of the Rating.
		value: 0,

		// readOnly: Boolean
		//		If false, the widget is editable and allows editing the value of the widget
		//		by touching / clicking the stars
		readOnly: false,

		// name: String
		//		mandatory if using the star rating widget in a form, in order to have it value submitted
		name: "",

		// disabled: Boolean
		//		if true, the widget is disabled (its value will not be submitted if it is included in a form)
		disabled: false,

		// editHalfValues: Boolean
		//		If the widget is not read only, define if the user is allowed to edit half values (0.5, 1.5, ...)
		editHalfValues: false,

		// editZero: Boolean
		//		If the widget is not read only, define if the user is allowed to set the value to zero
		editZero: true,

		/* internal properties */

		_incrementKeyCodes: [keys.RIGHT_ARROW, keys.UP_ARROW, keys.NUMPAD_PLUS], // keys to press to increment value
		_decrementKeyCodes: [keys.LEFT_ARROW, keys.DOWN_ARROW, keys.NUMPAD_MINUS], // keys to press to decrement value
		_cssSuffixes: {valueMarker: "-value-marker",
			noHalfValue: "-no-half-value",
			editing: "-editing",
			mouseHovered: "-mouse-hovered",
			},

		preCreate: function () {
			this.addInvalidatingProperties("max",
					"name",
					"value",
					"readOnly",
					"disabled",
					"editHalfValues",
					"editZero");
		},

		buildRendering: function () {
			this.style.display = "inline-block";

			// init WAI-ARIA attributes
			this.setAttribute("role", "slider");
			this.setAttribute("aria-label", messages["aria-label"]);
			this.setAttribute("aria-valuemin", 0);
            // init tabIndex if not explicitly set
            if (!this.hasAttribute("tabindex")) {
                this.setAttribute("tabindex", "0");
            }
            
            // Input node
			this.valueNode = this.getElementsByTagName("input")[0];
			if (!this.valueNode) {
				this.valueNode = domConstruct.create("input",
						{type: "number",
						name: this.name,
						readOnly: this.readOnly,
						disabled: this.disabled,
						value: this.value},
						this);
			} else {
				this.value = this.valueNode.value;
			}

			this.refreshRendering(this);
			
			// event handlers
			this.on("keydown", lang.hitch(this, "_onKeyDown"));
			this.on("mouseover", lang.hitch(this, "_onEnter"));
			this.on("mouseout", lang.hitch(this, "_onLeave"));
			this.on("click", lang.hitch(this, "_onClick"));
			if (has("touch")) {
				this.on("touchstart", lang.hitch(this, "_onTouchStart"));
				this.on("touchmove", lang.hitch(this, "_onTouchMove"));
			}
		},

		refreshRendering: function (props) {
			var i, divChildren;
			if (props.max !== undefined) {
				this.setAttribute("aria-valuemax", this.max);
			}
			if (props.max !== undefined || props.value !== undefined) {
				if (this.children.length !== (this.max * 2) + 2) {
					divChildren = this.getElementsByTagName("div");
					while (divChildren.length) {
						this.removeChild(divChildren[0]);
					}
					for (i = 0; i < (2 * this.max) + 1; i++) {
						domConstruct.create("div", {value: ((2 * this.max) - i) * 0.5}, this, "first");
					}
					this.children[0].style.width = this.editZero ? "" : "0px";
				}
				domClass.remove(this.children[this.valueNode.value * 2],
						this.baseClass + this._cssSuffixes.valueMarker);
				domClass.add(this.children[this.value * 2],
						this.baseClass + this._cssSuffixes.valueMarker);
			}
			if (props.value !== undefined) {
				this.setAttribute("aria-valuenow", this.value);
				this.setAttribute("aria-valuetext", string.substitute(messages["aria-valuetext"], this));
				this.valueNode.value = String(this.value);
			}
			if (props.name !== undefined) {
				this.valueNode.name = this.name;
			}
			if (props.disabled !== undefined) {
				if (this.disabled) {
					this.setAttribute("disabled", "");
				} else {
					this.removeAttribute("disabled");
				}
				this.valueNode.disabled = this.disabled;
			}
			if (props.readOnly !== undefined) {
				this.valueNode.readOnly = this.readOnly;
			}
			if (props.readOnly !== undefined || props.disabled !== undefined) {
				this.setAttribute("aria-disabled", this._isPassive());
			}
			if (props.readOnly !== undefined || props.disabled !== undefined || props.editHalfValues !== undefined) {
				domClass.toggle(this,
						this.baseClass + this._cssSuffixes.noHalfValue,
						!this._isPassive() && !this.editHalfValues);
			}
			if (props.editZero !== undefined) {
				this.children[0].style.width = this.editZero ? "" : "0px";
			}
		},

		_isPassive: function () {
			return this.disabled || this.readOnly;
		},

		_incrementValue: function () {
			if (this.value < this.max) {
				this.value = this.value + (this.editHalfValues ? 0.5 : 1);
			}
		},

		_decrementValue: function () {
			if (this.value > (this.editZero ? 0: (this.editHalfValues ? 0.5 : 1))) {
				this.value = this.value - (this.editHalfValues ? 0.5 : 1);
			}
		},

		///////////////////////////
		// Event handlers
		///////////////////////////

		_onKeyDown: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			if (this._incrementKeyCodes.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				this._incrementValue();
			} else if (this._decrementKeyCodes.indexOf(event.keyCode) !== -1) {
				event.preventDefault();
				this._decrementValue();
			}
		},

		_onEnter: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			event.preventDefault();
			domClass.add(this, this.baseClass + this._cssSuffixes.editing);
			domClass.add(event.target, this.baseClass + this._cssSuffixes.mouseHovered);
		},

		_onLeave: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			event.preventDefault();
			domClass.remove(this, this.baseClass + this._cssSuffixes.editing);
			domClass.remove(event.target, this.baseClass + this._cssSuffixes.mouseHovered);
		},

		_onClick: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			event.preventDefault();
			domClass.remove(event.target, this.baseClass + this._cssSuffixes.mouseHovered);
			domClass.remove(this, this.baseClass + this._cssSuffixes.editing);
			this.value = this._valueFromNode(event.target);
		},

		_onTouchStart: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			// When entering this, onTouchEnter may have been executed (example: on Android)
			event.preventDefault();
			var valueFromNode;
			domClass.remove(this, this.baseClass + this._cssSuffixes.editing);
			valueFromNode = this._valueFromNode(event.target);
			if (this.value !== valueFromNode) {
				this.value = valueFromNode;
				// make sure that the widget is repainted on android
				this._forceRepaint();
			}
		},

		_onTouchMove: function (/*Event*/ event) {
			if (this._isPassive()) {
				return;
			}
			event.preventDefault();
			var target = document.elementFromPoint(
					event.touches[0].pageX - window.scrollX, event.touches[0].pageY - window.scrollY),
				valueFromNode;
			if (target && target.parentNode === this) {
				valueFromNode = this._valueFromNode(target);
				if (this.value !== valueFromNode) {
					this.value = valueFromNode;
					// make sure that the widget is repainted on android
					this._forceRepaint();
				}
			}
		},

		_forceRepaint: function () {
			var that = this;
			domClass.add(this, "forceRepaint");
			this.defer(function () {
				domClass.remove(that, "forceRepaint");
			});
		},

		_valueFromNode: function (node) {
			return this.editHalfValues ? node.value : Math.ceil(node.value);
		}

	});

	return register("d-star-rating",
			has("dojo-bidi") ? [HTMLElement, StarRating, BidiStarRating] : [HTMLElement, StarRating]);
});
