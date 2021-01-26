const linkL10n = (() => {
	var localize = function (element) {
		html10n.translateElement(html10n.translations, element.get(0));
	};
	return {
		localize
	}
})();
