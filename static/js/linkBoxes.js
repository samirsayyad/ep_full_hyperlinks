const linkBoxes = (() => {
	let padOuter;
	const getPadOuter = () =>
		(padOuter = padOuter || $('iframe[name="ace_outer"]').contents());

	const getLinksContainer = () => getPadOuter().find("#linkBoxWrapper");

	/* ***** Public methods: ***** */

	const showLink = (linkId) => getLinksContainer().find(`#${linkId}`).show();

	const hideLink = (linkId) => {
		getLinksContainer().find(`#${linkId}`).hide();
		padOuter.find(`#show-form-${linkId}`).show();
		padOuter.find(`#edit-form-${linkId}`).hide();
	};

	const hideAllLinks = () => getLinksContainer().find(`.link-container`).hide();

	const validURL = (str) => {
		var pattern = new RegExp(
			"^(https?:\\/\\/)?" + // protocol
				"((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
				"((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
				"(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
				"(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
				"(\\#[-a-z\\d_]*)?$",
			"i"
		); // fragment locator
		return !!pattern.test(str);
	};

	const showLinkModal = (e, linkObj, socket) => {
		const padOuter = $('iframe[name="ace_outer"]').contents();
		const padInner = getPadOuter().find('iframe[name="ace_inner"]');
		const linkId = linkObj.linkId;
		const linkModalAppended =
			getLinksContainer().find(`#${linkId}`).length === 0 ? false : true;

		hideAllLinks();

		// find link modal, if does not exist create a link modal
		let linkModal = getLinksContainer().find(`#${linkId}`);
		if (!linkModalAppended)
			linkModal = $("#linkBoxTemplate").tmpl({ ...linkObj });

		// apppend modal position! where it want appear
		let targetLeft = e.clientX;
		targetLeft += padInner.offset().left;
		let targetTop = $(e.target).offset().top;
		targetTop += parseInt(padInner.css("padding-top").split("px")[0]);
		targetTop += parseInt(
			padOuter.find("#outerdocbody").css("padding-top").split("px")[0]
		);

		linkModal.css({ width: "324px" }); // because of need to determine exact size for putting best area
		linkModal.css({ left: `${parseInt(targetLeft)}px` });
		linkModal.css({ top: `${parseInt(targetTop) + 35}px` });
		linkModal.addClass("hyperlink-display");

		const loaded = linkModal.attr("data-loaded");

		// if the linkModal was not appended, create a modal and append it to #linkBoxWrapper
		if (!linkModalAppended) {
			padOuter.find("#linkBoxWrapper").append(linkModal);
		} else {
			// if the modal was exist update text and hypertext
			linkModal.show();
			// if the old hyperlink was not same as new hyperlink
			if (
				linkObj.hyperlink !== linkModal.find("#ep_hyperlink_title").attr("href")
			) {
				linkModal.attr("data-loaded", "false");
			}
			linkModal.attr("data-hyperlink", linkObj.hyperlink);
			linkModal.find("input#hyperlink-url").val(linkObj.hyperlink);
			linkModal
				.find("input#hyperlink-text, input#hyperlink-text-hidden")
				.val(linkObj.text);
			linkModal.find("a#ep_hyperlink_title").attr({
				title: linkObj.hyperlink,
				href: linkObj.hyperlink,
			});
		}

		// TODO: 1/ hyperlink for social and
		// TODO: 2/ inside link
		if (loaded != "true") {
			var hyperlink = linkObj.hyperlink || linkModal.attr("data-hyperlink");
			const dividedUrl = new URL(hyperlink);

			const ep_hyperlink_img = linkModal.find("#ep_hyperlink_img");
			const ep_hyperlink_title = linkModal.find("#ep_hyperlink_title");
			const card_loading_hyperlink = linkModal.find("#card_loading_hyperlink");
			const ep_hyperlink_description = linkModal.find(
				"#ep_hyperlink_description"
			);

			ep_hyperlink_description.text("");
			ep_hyperlink_title.text(hyperlink);

			ep_hyperlink_img.hide();
			ep_hyperlink_title.show();
			card_loading_hyperlink.show();

			// raise for og:title resolving

			if (!/^http:\/\//.test(hyperlink) && !/^https:\/\//.test(hyperlink)) {
				hyperlink = `https://${hyperlink}`;
			}

			const changeMetaView = function (hyperlink, title, image) {
				ep_hyperlink_img.attr("src", image);
				ep_hyperlink_img.on("load", () => {
					card_loading_hyperlink.fadeOut(500, () => {
						ep_hyperlink_img.fadeIn();
						ep_hyperlink_title.text(
							title.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
						);
						ep_hyperlink_description.text(
							hyperlink.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
						);
						linkModal.attr({ "data-loaded": true });
					});
				});
			};
			if (!validURL(hyperlink)) {
				const img =
					"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png";
				changeMetaView(hyperlink, hyperlink, img);
				return false;
			}
			// ........
			const metaResolverCallBack = function (result) {
				//ep_hyperlink_title.attr('href', hyperlink);

				if (result.metadata.image && result.metadata.title) {
					changeMetaView(
						hyperlink,
						result.metadata.title,
						result.metadata.image
					);
				} else {
					var editedHyperlink = `https://${dividedUrl.hostname}`;
					if (result.last !== true) {
						socket.emit(
							"metaResolver",
							{ padId: clientVars.padId, editedHyperlink, last: true },
							metaResolverCallBack
						);
					} else {
						changeMetaView(
							hyperlink,
							result.metadata.title || hyperlink,
							"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png"
						);
					}
				}
			};
			// ........
			switch (dividedUrl.hostname) {
				case "twitter.com":
					changeMetaView(
						hyperlink,
						hyperlink,
						"../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png"
					);
					break;
				default:
					socket.emit(
						"metaResolver",
						{ padId: clientVars.padId, hyperlink, last: false },
						metaResolverCallBack
					);
			}
		}
	};

	// Indicates if event was on one of the elements that does not close link
	const shouldNotCloseLink = function (e) {
		// a link box
		if (
			$(e.target).closest(".link").length ||
			$(e.target).closest(".link-modal").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_edit").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_delete").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_copy").length ||
			$(e.target).closest(".full-display-link").length ||
			$(e.target).closest(".link-title-wrapper").length ||
			$(e.target).closest(".link-edit-form").length ||
			$(e.target).closest(".link-text-text").length ||
			$(e.target).closest(".link-text-hyperlink").length
		) {
			// the link modal
			return true;
		}
		return false;
	};

	return {
		showLink,
		hideLink,
		hideAllLinks,
		showLinkModal,
		getLinksContainer,
		shouldNotCloseLink,
	};
})();
