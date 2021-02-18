const newLink = (() => {

	// Create a link object with data filled on the given form
	var buildLinkFrom = function (form) {
		const text = form.find('#hyperlink-text').val();
		const oldText = form.find('#hyperlink-text-hidden').val();
		let hyperlink = form.find('#hyperlink-url').val();
		const changeFrom = form.find('.from-value').text();
		const changeTo = form.find('.to-value').val() || null;
		const link = {};
		if (!(/^http:\/\//.test(hyperlink)) && !(/^https:\/\//.test(hyperlink))) {
			hyperlink = `https://${hyperlink}`;
		}
		link.text = text;
		link.oldText = oldText;
		link.hyperlink = hyperlink;

		if (changeTo) {
			link.changeFrom = changeFrom;
			link.changeTo = changeTo;
		}
		return link;
	};

	// Callback for new link Cancel
	var cancelNewLink = function () {
		hideNewLinkPopup();
	};

	// Callback for new link Submit
	var submitNewLink = function (callback) {
		const index = 0;
		const form = $('#newLink');
		const link = buildLinkFrom(form);
		if ((link.text.length > 0 || link.changeTo && link.changeTo.length > 0) && validURL(link.hyperlink)) {
			form.find('.link-content, .to-value').removeClass('error');
			hideNewLinkPopup();
			callback(link, index);
		} else {
			if (link.text.length == 0) form.find('.link-content').addClass('error');
			if (!validURL(link.hyperlink)) form.find('#hyperlink-url').addClass('error');

			if (link.changeTo && link.changeTo.length == 0) form.find('.to-value').addClass('error');
		}
		return false;
	};

	var validURL = function (str) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
		  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
		return !!pattern.test(str);
	  };
	/* ***** Public methods: ***** */

	var localizenewLinkPopup = function () {
		const newLinkPopup = $('#newLink');
		if (newLinkPopup.length !== 0) linkL10n.localize(newLinkPopup);
	};

	// Insert new Link Form
	var insertNewLinkPopupIfDontExist = function (link, callback) {
		$('#newLink').remove();
		var newLinkPopup = $('#newLink');

		link.linkId = '';
		var newLinkPopup = $('#newLinkTemplate').tmpl(link);
		newLinkPopup.appendTo($('#editorcontainerbox'));

		localizenewLinkPopup();

		// Listen for include suggested change toggle
		$('#newLink').find('.suggestion-checkbox').change(function () {
			$('#newLink').find('.suggestion').toggle($(this).is(':checked'));
		});

		// Cancel btn
		newLinkPopup.find('#link-reset').on('click', () => {
			cancelNewLink();
		});
		// Create btn // link-create-btn
		$('#newLink').on('submit', (e) => {
			e.preventDefault();
			return submitNewLink(callback);
		});

		return newLinkPopup;
	};

	var showNewLinkPopup = function () {
		// position below link icon
		$('#newLink').css('left', $('.toolbar .addLink').offset().left);

		// Reset form to make sure it is all clear
		$('#newLink').find('.suggestion-checkbox').prop('checked', false).trigger('change');
		$('#newLink').find('textarea').val('');
		$('#newLink').find('.link-content, .to-value').removeClass('error');

		// Show popup
		$('#newLink').addClass('popup-show');


		// mark selected text, so it is clear to user which text range the link is being applied to
		pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText();

		// focus on hyperlink input


		setTimeout(() => { $('#newLink').find('.link-content').focus().select(); }, 500);
	};

	var hideNewLinkPopup = function () {
		$('#newLink').removeClass('popup-show');

		// force focus to be lost, so virtual keyboard is hidden on mobile devices
		$('#newLink').find(':focus').blur();

		// unmark selected text, as now there is no text being linked
		pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText();
	};
	
	return {
		localizenewLinkPopup,
		insertNewLinkPopupIfDontExist,
		showNewLinkPopup,
		hideNewLinkPopup,

	}

})();
