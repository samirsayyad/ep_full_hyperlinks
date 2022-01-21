exports.moduleList=(()=>{const e=require("ep_etherpad-lite/static/js/pad_utils").randomString,t=require("ep_etherpad-lite/static/js/underscore"),n=function(){"use strict";const e=function(e){return e.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/)};function t(t){if(!t)return;if(/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(t))return;if(/%[^0-9a-f]/i.test(t))return;if(/%[0-9a-f](:?[^0-9a-f]|$)/i.test(t))return;let n=[],i="",r="",l="",a="",s="",o="";if(n=e(t),i=n[1],r=n[2],l=n[3],a=n[4],s=n[5],i&&i.length&&l.length>=0){if(r&&r.length){if(0!==l.length&&!/^\//.test(l))return}else if(/^\/\//.test(l))return;if(/^[a-z][a-z0-9\+\-\.]*$/.test(i.toLowerCase()))return o+=i+":",r&&r.length&&(o+="//"+r),o+=l,a&&a.length&&(o+="?"+a),s&&s.length&&(o+="#"+s),o}}function n(n,i){if(!t(n))return;let r=[],l="",a="",s="",o="",c="",d="",p="";if(r=e(n),l=r[1],a=r[2],s=r[3],c=r[4],d=r[5],l){if(i){if("https"!=l.toLowerCase())return}else if("http"!=l.toLowerCase())return;if(a)return/:(\d+)$/.test(a)&&(o=a.match(/:(\d+)$/)[0],a=a.replace(/:\d+$/,"")),p+=l+":",p+="//"+a,o&&(p+=o),p+=s,c&&c.length&&(p+="?"+c),d&&d.length&&(p+="#"+d),p}}function i(e){return n(e,!0)}function r(e){return n(e)||i(e)}return{is_uri:t,is_http_uri:n,is_https_uri:i,is_web_uri:r,isUri:t,isHttpUri:n,isHttpsUri:i,isWebUri:r}}(),i=(()=>{const n=(e,n)=>{const i=(e=>{const n={};return t.each(e,(e,t)=>{const i=e.data.originalLinkId;n[i]=t}),n})(e);t.each(i,(e,t)=>{$(n).find("."+t).removeClass(t).addClass(e)});return o(n)},i=(e,n)=>{const i={},a=l(e);return t.each(a,e=>{const t=r(),l=n[e];l.data.originalLinkId=e,i[t]=l}),i},r=()=>"fakelink-"+e(16),l=e=>{const n=$(e).find("span"),i=[];t.each(n,e=>{const t=$(e).attr("class"),n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t),r=!!n&&n[1];r&&i.push(r)});return t.uniq(i)},a=e=>{const t=e.cloneContents(),n=document.createElement("div");return $(n).html(t)},o=e=>$(e).html(),c=e=>{const t=o(e);return w(t)===$(e).text()},d=(e,t,n)=>{const i=h(e,n),r=p(i,t);return $.parseHTML(`<div>${r}</div>`)},p=(e,t)=>{const n=t.commonAncestorContainer.parentNode,i=f(n);return i&&(e=u(i)+e+k(i)),e},h=(e,t)=>`<span class="link ${t}">${e.slice(0,-1)}</span>`+`<span class="link ${t}">${e.slice(-1)}</span>`,u=e=>{let t="";return e.forEach(e=>{t+=`<${e}>`}),t},k=e=>{let t="";return(e=e.reverse()).forEach(e=>{t+=`</${e}>`}),t},f=e=>{const t=[];let n;if($(e)[0].hasOwnProperty("localName"))for(;"span"!==$(e)[0].localName;){const i=$(e).prop("outerHTML"),r=/<(b|i|u|s)>/.exec(i);n=r?r[1]:"",t.push(n),e=$(e).parent()}return t},g=e=>{const n={},i=clientVars.padId,r=pad.plugins.ep_full_hyperlinks.mapOriginalLinksId,l=pad.plugins.ep_full_hyperlinks.mapFakeLinks;t.each(e,(e,t)=>{m(e,t);const i=s.generateLinkId();l[t]=i;const a=e.data.originalLinkId;r[a]=i,n[i]=e}),pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(i,n)},m=(e,t)=>{const n={};return n.padId=clientVars.padId,n.link=e.data,n.link.linkId=t,n},w=e=>{const t=document.createElement("div");return t.innerHTML=e,0===t.childNodes.length?"":t.childNodes[0].nodeValue},_=(e,t,n,i)=>{let r=!1;for(let l=e;l<=t&&!r;l++){const a=y(l,n,e),s=x(l,n,t);L(l,a,s,i)&&(r=!0)}return r},y=(e,t,n)=>e!==n?0:t.selStart[1],x=(e,t,n)=>{let i;return i=e!==n?b(e,t):t.selEnd[1]-1,i},L=(e,n,i,r)=>{let l=!1;for(let a=n;a<=i&&!l;a++){void 0!==t.object(r.getAttributesOnPosition(e,a)).link&&(l=!0)}return l},v=(e,t)=>e!==t,b=(e,t)=>{const n=e+1,i=t.lines.offsetOfIndex(e);return t.lines.offsetOfIndex(n)-i-1};return{addTextOnClipboard:(e,t,r,s,o)=>{let p,h;if(t.callWithAce(e=>{p=e.ace_getLinkIdOnFirstPositionSelected(),h=e.ace_hasLinkOnSelection()}),h){let t;const h=r.contents()[0].getSelection().getRangeAt(0),u=a(h);let k=u;if(c(u)){const e=u[0].textContent;k=d(e,h,p)}l(k);t=i(k,o);const f=n(t,k);t=JSON.stringify(t),e.originalEvent.clipboardData.setData("text/objectLink",t),e.originalEvent.clipboardData.setData("text/html",f),e.preventDefault(),s&&r.contents()[0].execCommand("delete")}},getLinkIdOnFirstPositionSelected:function(){const e=this.documentAttributeManager,n=this.rep;return t.object(e.getAttributesOnPosition(n.selStart[0],n.selStart[1])).link},hasLinkOnSelection:function(){let e;const t=this.documentAttributeManager,n=this.rep,i=n.selStart[0],r=n.selStart[1],l=n.selEnd[1],a=n.selEnd[0];return e=v(i,a)?_(i,a,n,t):L(i,r,l,t),e},saveLinks:(e,n)=>{let i=e.originalEvent.clipboardData.getData("text/objectLink");if(i)i=JSON.parse(i),g(i);else{let i,r,l="";i=e.originalEvent.clipboardData||window.clipboardData,r=i.getData("text");const a=i.getData("text/html");if(!n.contents()[0].getSelection().getRangeAt(0))return!1;if(a){e.preventDefault();const i=document.createElement("div");i.innerHTML=a;const r=i.getElementsByTagName("a"),l={};t.each(r,e=>{const t=e.href,n=e.innerHTML,i=s.generateLinkId();e.className=i,e.id=i,l[i]={data:{author:"empty",linkId:i,timestamp:(new Date).getTime(),text:n,originalLinkId:i,hyperlink:t,headerId:null,date:new Date,formattedDate:new Date}}}),pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(clientVars.padId,l),n.contents()[0].execCommand("insertHTML",!1,$("<div>").append($(i).clone()).html())}else if(new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(r)){const t=/(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi,i=r.match(t),a={};if(i){for(match in i.reverse()){const e={},t=s.generateLinkId();e.link=i[match],a[t]={data:{author:"empty",linkId:t,timestamp:(new Date).getTime(),text:e.link,originalLinkId:t,hyperlink:e.link,headerId:null,date:new Date,formattedDate:new Date}},e.startsAt=r.indexOf(i[match]);const n=`<span id="${t}" class="${t}">`,l="</span>";r=[r.slice(0,e.startsAt),n,r.slice(e.startsAt)].join(""),e.endsAt=r.indexOf(i[match])+i[match].length,r=[r.slice(0,e.endsAt),l,r.slice(e.endsAt)].join("")}r=r.replace(/(?:\r\n|\r|\n)/g,"<br>"),l=$("<div></div>").html(r),n.contents()[0].execCommand("insertHTML",!1,$("<div>").append($(l).clone()).html()),pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(clientVars.padId,a),e.preventDefault()}}}}}})(),r=(()=>{let e;const t=()=>e=e||$('iframe[name="ace_outer"]').contents(),i=()=>t().find("#linkBoxWrapper"),l=()=>i().find(".link-container").hide(),a=(e,t,n)=>{const i=(e=>{let t=0,n=0;return e||(e=window.event),e.pageX||e.pageY?(t=e.pageX,n=e.pageY):(e.clientX||e.clientY)&&(t=e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft,n=e.clientY+document.body.scrollTop+document.documentElement.scrollTop),{x:t,y:n}})(e);clickCoordsX=i.x,clickCoordsY=i.y;const r=t.innerWidth(),l=t.innerHeight();windowWidth=n.innerWidth(),windowHeight=n.innerHeight();let a=e.clientX+n.offset().left+"px",s=clickCoordsY+"px";windowWidth-clickCoordsX<r&&(a=windowWidth-r+"px"),windowHeight-clickCoordsY<l&&(s=windowHeight-l+"px"),t.css({left:a}),t.css({top:parseInt(s)+35+"px"})},s=e=>{const t=new URL(e);let n=!1;if(t.origin!==location.origin)return!1;if(t.origin===location.origin){const e=location.pathname.split("/").indexOf("p")>0,t=clientVars.padId,i=e?"/p/"+t:"/"+t;location.pathname.substring(0,i.length)===i&&(n=!0),clientVars.ep_singlePad.active&&(n=!0)}return n},o=e=>{const t=[],n=clientVars.padId,i=e.pathname.split("/");let r=i.indexOf(n)+1;clientVars.ep_singlePad.active&&(r=0);const l=[...i].splice(r,i.length-1);return t.push(...l),t};return{showLink:e=>i().find("#"+e).show(),hideLink:t=>{i().find("#"+t).hide(),e.find("#show-form-"+t).show(),e.find("#edit-form-"+t).hide()},hideAllLinks:l,showLinkModal:(e,s,o)=>{const c=$('iframe[name="ace_outer"]').contents(),d=t().find('iframe[name="ace_inner"]'),p=s.linkId,h=0!==i().find("#"+p).length;l();let u=i().find("#"+p);h||(u=$("#linkBoxTemplate").tmpl({...s}));const k=u.attr("data-loaded");h?(u.show(),s.hyperlink!==u.find("a.ep_hyperlink_title").attr("href")&&u.attr("data-loaded","false"),u.attr("data-hyperlink",s.hyperlink),u.find("input#hyperlink-url").val(s.hyperlink),u.find("a.ep_hyperlink_title").attr({title:s.hyperlink,href:s.hyperlink})):c.find("#linkBoxWrapper").append(u);const f=d.contents().find("."+p).text();if(u.find("input#hyperlink-text-hidden").val(f),u.find("input#hyperlink-text").val(f),"true"!=k){let e,t=s.hyperlink||u.attr("data-hyperlink");try{e=new URL(t)}catch(e){return console.error("[hyperlink]: "+e),void r.hideLink(p)}const i=u.find("#ep_hyperlink_img"),l=u.find("a.ep_hyperlink_title"),a=u.find("#card_loading_hyperlink"),c=u.find("#ep_hyperlink_description");c.text(""),l.text(t),i.hide(),l.show(),a.show(),/^http:\/\//.test(t)||/^https:\/\//.test(t)||(t="https://"+t);const d=function(e,t,n){i.attr("src",n),i.on("load",()=>{a.fadeOut(500,()=>{i.fadeIn(),l.text(t.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),c.text(e.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),u.attr({"data-loaded":!0})})})};if(!n.isUri(t)){return d(t,t,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png"),!1}const h=function(n){if(n.metadata.image&&n.metadata.title)d(t,n.metadata.title,n.metadata.image);else{var i="https://"+e.hostname;!0!==n.last?o.emit("metaResolver",{padId:clientVars.padId,editedHyperlink:i,last:!0},h):d(t,n.metadata.title||t,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png")}};switch(e.hostname){case"twitter.com":d(t,t,"../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png");break;default:o.emit("metaResolver",{padId:clientVars.padId,hyperlink:t,last:!1},h)}}a(e,u,d),u.addClass("hyperlink-display")},getLinksContainer:i,shouldNotCloseLink:function(e){return!!($(e.target).closest(".link").length||$(e.target).closest(".link-modal").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_edit").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_delete").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_copy").length||$(e.target).closest(".full-display-link").length||$(e.target).closest(".link-title-wrapper").length||$(e.target).closest(".link-edit-form").length||$(e.target).closest(".link-text-text").length||$(e.target).closest(".link-text-hyperlink").length)},internalLinkClick:function(e){e.preventDefault(),e.stopPropagation();const t=$(this).attr("href");if(console.log("internalLinkClick",t,s(t),o(new URL(t))),s(t)){const e=new URL(t);let n=""+e.search;const i=o(e);if(i.length>0){n=location.pathname.split("/").indexOf("p")>0?"/p":"",clientVars.ep_singlePad.active||(n+="/"+clientVars.padId),n+=`/${i.join("/")}${e.search}`}0===e.search.length&&(n=t);const r=i.length>0?"filter":"other";window.history.pushState({type:"hyperLink",href:t,target:r},document.title,n),l()}else window.open(t,"_blank");return!1}}})(),l=(()=>{const e=function(e){const i=$(document).find("#newLink"),r=(e=>({text:e.find("#hyperlink-text").val(),oldText:e.find("#hyperlink-text-hidden").val(),hyperlink:e.find("#hyperlink-url").val()}))(i);return r.text.length>0&&n.isUri(r.hyperlink)?(i.find("#hyperlink-text, #hyperlink-url").removeClass("error"),t(),e(r,0)):(0===r.text.length&&i.find("#hyperlink-text").addClass("error"),n.isUri(r.hyperlink)||i.find("#hyperlink-url").addClass("error")),!1},t=()=>{$("#newLink").removeClass("popup-show"),$("#newLink").find(":focus").blur(),pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText()};return{insertNewLinkPopupIfDontExist:(n,i)=>{$("#newLink").remove(),n.linkId="";const r=$("#newLinkTemplate").tmpl(n);return r.appendTo($("#editorcontainerbox")),$("#newLink #link-cancel-btn").on("click",e=>t()),$("#newLink #link-create-btn").on("click",t=>e(i)),$(document).on("submit","form.link-edit-form",(function(t){t.preventDefault(),e(i)})),r},showNewLinkPopup:()=>{$("#newLink").css("left",$(".toolbar .addLink").offset().left),$("#newLink").find("textarea").val(""),$("#newLink").find(".link-content, .to-value").removeClass("error"),$("#newLink").addClass("popup-show"),pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText(),setTimeout(()=>$("#newLink #hyperlink-url").focus().select(),500)},hideNewLinkPopup:t}})(),a=(()=>{const e="pre-selected-link",t=function(e){this.ace=e;const t=this;this.highlightSelectedText()&&setTimeout(()=>{t.unmarkSelectedText()},0)};t.prototype.highlightSelectedText=function(){return clientVars.highlightSelectedText},t.prototype.markSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(n,"markPreSelectedTextToLink",!0)},t.prototype.unmarkSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(n,"unmarkPreSelectedTextToLink",!0)},t.prototype.performNonUnduableEvent=function(e,t,n){t.startNewEvent("nonundoable"),n(),t.startNewEvent(e)},t.prototype.handleMarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i),this.addMark(t,i)},t.prototype.handleUnmarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i)},t.prototype.addMark=function(t,n){const i=n.editEvent.eventType;this.performNonUnduableEvent(i,n,()=>{t.ace_setAttributeOnSelection(e,clientVars.userId)})},t.prototype.removeMarks=function(t,n,i){const r=i.editEvent.eventType,l=n.selStart,a=n.selEnd;this.performNonUnduableEvent(r,i,()=>{const n=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]'),i=t.ace_getRepFromSelector(".pre-selected-link",n);$.each(i,(n,i)=>{t.ace_performSelectionChange(i[0],i[1],!0),t.ace_setAttributeOnSelection(e,!1)}),t.ace_performSelectionChange(l,a,!0)})};const n=()=>{};return{MARK_CLASS:e,init:e=>new t(e)}})(),s={collectContentPre:(e,t)=>{const n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t.cls),i=/(?:^| )(fakelink-[A-Za-z0-9]*)/.exec(t.cls);if(n&&n[1]&&t.cc.doAttrib(t.state,"link::"+n[1]),i){const e=pad.plugins.ep_full_hyperlinks.getMapfakeLinks()[i[1]];t.cc.doAttrib(t.state,"link::"+e)}return[]},generateLinkId:function(){return"lc-"+e(16)}};return{validUrl:n,events:i,linkBoxes:r,newLink:l,preLinkMark:a,shared:s}})();
//# sourceMappingURL=ep.full.hyperlinks.mini.js.map
