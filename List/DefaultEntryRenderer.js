define(["dcl/dcl",
        "delite/register",
        "dojo/dom-construct",
        "dojo/dom-class",
        "./AbstractEntryRenderer"
], function (dcl, register, domConstruct, domClass, AbstractEntryRenderer) {
	
	var DefaultEntryRenderer = dcl([AbstractEntryRenderer], {

		renderEntry: function (entry) {
			this._renderTextNode("labelNode", entry ? entry.label : null, "d-list-entry-label");
			this._renderImageNode("iconNode", entry ? entry.icon : null, "d-list-entry-icon");
			this._renderTextNode("rightText", entry ? entry.rightText : null, "d-list-entry-right-text");
			this._renderImageNode("rightIcon2", entry ? entry.rightIcon2 : null, "d-list-entry-right-icon2");
			this._renderImageNode("rightIcon", entry ? entry.rightIcon : null, "d-list-entry-right-icon");
			this._setFocusableChildren(["iconNode", "labelNode", "rightText", "rightIcon2", "rightIcon"]);
		},

		_renderTextNode: function (nodeName, text, nodeClass) {
			if (text) {
				if (this[nodeName]) {
					this[nodeName].innerHTML = text;
				} else {
					this[nodeName] = domConstruct.create("DIV",
							{id: this.id + nodeName, innerHTML: text, class: nodeClass, tabindex: -1},
							this.containerNode, 0);
				}
			} else {
				if (this[nodeName]) {
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		},

		_renderImageNode: function (nodeName, image, nodeClass) {
			if (image) {
				if (this[nodeName]) {
					if (this[nodeName].getAttribute("src") !== image) {
						this[nodeName].src = image;
					}
				} else {
					this[nodeName] = domConstruct.create("IMG",
							{id: this.id + nodeName, src: image, class: nodeClass, tabindex: -1},
							this.containerNode, 0);
				}
			} else {
				if (this[nodeName]) {
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		}

	});

	return register("d-list-entry", [HTMLElement, DefaultEntryRenderer]);
});