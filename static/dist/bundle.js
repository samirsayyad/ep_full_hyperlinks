"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const e=e=>{const t=e.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);return{uri:t[0],scheme:t[1],authority:t[2],path:t[3],query:t[4],fragment:t[5]}},t=t=>{if(!t)return;if(/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(t))return;if(/%[^0-9a-f]/i.test(t))return;if(/%[0-9a-f](:?[^0-9a-f]|$)/i.test(t))return;let n=[],i="",o="",r="",s="",a="",l="";if(n=e(t),i=n.scheme,o=n.authority,r=n.path,s=n.query,a=n.fragment,o&&o.length){if(0!==r.length&&!/^\//.test(r))return}else if(/^\/\//.test(r))return;return i&&i.length&&!/^[a-z][a-z0-9\+\-\.]*$/.test(i.toLowerCase())?void 0:(i&&i.length&&(l+=`${i}:`),o&&o.length&&(l+=`//${o}`),l+=r,s&&s.length&&(l+=`?${s}`),a&&a.length&&(l+=`#${a}`),l)};let n;const i=()=>n=n||$('iframe[name="ace_outer"]').contents(),o=()=>i().find("#linkBoxWrapper"),r=e=>{o().find(`#${e}`).hide(),n.find(`#show-form-${e}`).show(),n.find(`#edit-form-${e}`).hide()},s=()=>o().find(".link-container").hide(),a=(e,t,n)=>{const i=(e=>{let t=0,n=0;return e||(e=window.event),e.pageX||e.pageY?(t=e.pageX,n=e.pageY):(e.clientX||e.clientY)&&(t=e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft,n=e.clientY+document.body.scrollTop+document.documentElement.scrollTop),{x:t,y:n}})(e),o=i.x,r=i.y,s=t.innerWidth(),a=t.outerHeight(!0),l=n.innerWidth(),c=n.outerHeight(!0),d=parseInt(n.css("padding-top")),p=parseInt($(e.target).offset().top),h=parseInt($(e.target).outerHeight(!0));let u=e.clientX+n.offset().left,k=p+h+d/2;l-o<s&&(u=l-s-16),c-r<a&&(k=c-a),$("body").hasClass("mobileView")||(k+=35),$("body").hasClass("mobileView")?(t.css({left:"50%",top:`${k}px`,transform:"translateX(-50%)",width:"96vw"}),t.find("a.ep_hyperlink_title").css({"margin-left":"4px"}),t.find(".ep_hyperlink_docs_bubble_button_container").css({"margin-left":"auto"})):t.css({left:`${u}px`,top:`${k}px`})},l=function(e){e.preventDefault(),e.stopPropagation();const t=$(this).attr("href");if((e=>{const t=new URL(e);let n=!1;if(t.origin!==location.origin)return!1;if(t.origin===location.origin){const e=location.pathname.split("/").indexOf("p")>0,t=clientVars.padId,i=e?`/p/${t}`:`/${t}`;location.pathname.substring(0,i.length)===i&&(n=!0),clientVars.ep_singlePad.active&&(n=!0)}return n})(t)){const e=new URL(t);let n=`${e.search}`;const i=(e=>{const t=[],n=clientVars.padId,i=e.pathname.split("/");let o=i.indexOf(n)+1;clientVars.ep_singlePad.active&&(o=0);const r=[...i].splice(o,i.length-1);return t.push(...r),t})(e);if(i.length>0){n=location.pathname.split("/").indexOf("p")>0?"/p":"",clientVars.ep_singlePad.active||(n+=`/${clientVars.padId}`),n+=`/${i.join("/")}${e.search}`}0===e.search.length&&(n=t);const o=i.length>0?"filter":"other";window.history.pushState({type:"hyperLink",href:t,target:o},document.title,n),s()}else window.open(t,"_blank");return!1},c=()=>{$("#newLink").removeClass("popup-show"),$("#newLink").find(":focus").blur(),pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText()},d=n=>{const i=$(document).find("#newLink"),o=(e=>({text:e.find("#hyperlink-text").val(),oldText:e.find("#hyperlink-text-hidden").val(),hyperlink:e.find("#hyperlink-url").val()}))(i);return e(o.hyperlink).scheme||(o.hyperlink=`https://${o.hyperlink}`),o.text.length>0&&t(o.hyperlink)?(i.find("#hyperlink-text, #hyperlink-url").removeClass("error"),c(),n(o,0)):(0===o.text.length&&i.find("#hyperlink-text").addClass("error"),t(o.hyperlink)||i.find("#hyperlink-url").addClass("error")),!1},p=(e,t)=>{$("#newLink").remove(),e.linkId="";const n=$("#newLinkTemplate").tmpl(e);return n.appendTo($("#editorcontainerbox")),$("#newLink #link-cancel-btn").on("click",(e=>c())),$("#newLink #link-create-btn").on("click",(e=>d(t))),$(document).on("submit","form.link-edit-form",(e=>{e.preventDefault(),d(t)})),n},h="pre-selected-link",u=()=>{},k=function(e){this.ace=e;const t=this;this.highlightSelectedText()&&setTimeout((()=>{t.unmarkSelectedText()}),0)};k.prototype.highlightSelectedText=function(){return clientVars.highlightSelectedText},k.prototype.markSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(u,"markPreSelectedTextToLink",!0)},k.prototype.unmarkSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(u,"unmarkPreSelectedTextToLink",!0)},k.prototype.performNonUnduableEvent=function(e,t,n){t.startNewEvent("nonundoable"),n(),t.startNewEvent(e)},k.prototype.handleMarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i),this.addMark(t,i)},k.prototype.handleUnmarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i)},k.prototype.addMark=function(e,t){const n=t.editEvent.eventType;this.performNonUnduableEvent(n,t,(()=>{e.ace_setAttributeOnSelection(h,clientVars.userId)}))},k.prototype.removeMarks=function(e,t,n){const i=n.editEvent.eventType,o=t.selStart,r=t.selEnd;this.performNonUnduableEvent(i,n,(()=>{const t=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]'),n=`.${h}`,i=e.ace_getRepFromSelector(n,t);$.each(i,((t,n)=>{e.ace_performSelectionChange(n[0],n[1],!0),e.ace_setAttributeOnSelection(h,!1)})),e.ace_performSelectionChange(o,r,!0)}))};const f=()=>`lc-${(e=>{const t="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";let n="";e=e||20;for(let i=0;i<e;i++){const e=Math.floor(Math.random()*t.length);n+=t.substring(e,e+1)}return n})(16)}`,m=(e,t,n,i)=>{e.preventDefault();const o=((e,t)=>{const n=e[0].contentWindow.getSelection().getRangeAt(0),i=document.createElement("div");i.append(n.cloneContents());try{i.querySelectorAll(".link").forEach((e=>{const n=e.getAttribute("class"),o=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(n)[1];let r;t[o]?(r=document.createElement("a"),r.innerHTML=e.innerHTML,r.setAttribute("href",t[o].data.hyperlink)):(r=document.createElement("span"),r.innerHTML=e.innerHTML),i.querySelector(`.${o}`).replaceWith(r)}))}catch(e){console.error("[ep_full_hyperlinks]: copy data has an error",e)}return i})(t,i);e.originalEvent.clipboardData.setData("text/html",o.outerHTML),n&&t.contents()[0].execCommand("delete")},g=(e,t)=>{((e,t)=>{const n=e.originalEvent.clipboardData.getData("text/html");if(!t.contents()[0].getSelection().getRangeAt(0))return!1;e.preventDefault();const i=document.createElement("div");i.innerHTML=n;const o=i.getElementsByTagName("a"),r={};for(const e of o){const t=e.href,n=e.innerHTML,i=f();e.className=i,e.id=i,r[i]={data:{author:"empty",linkId:i,timestamp:(new Date).getTime(),text:n,originalLinkId:i,hyperlink:t,headerId:null,date:new Date,formattedDate:new Date}}}pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(clientVars.padId,r),t.contents()[0].execCommand("insertHTML",!1,$("<div>").append($(i).clone()).html())})(e,t)},y=["ep_full_hyperlinks/static/css/link.css"];function x(e){this.container=null,this.padOuter=null,this.padInner=null,this.ace=e.ace;const t=document.location,n=""===t.port?"https:"===t.protocol?443:80:t.port,i=`${t.protocol}//${t.hostname}:${n}/link`;var o;this.padId=clientVars.padId,this.socket=io.connect(i,{query:`padId=${this.padId}`}),this.padId=clientVars.padId,this.links=[],this.mapFakeLinks=[],this.mapOriginalLinksId=[],this.init(),this.preLinkMarker=(o=this.ace,new k(o))}x.prototype.init=async function(){const e=this;this.findContainers(),this.insertContainers();const n=await this.getLinks();$.isEmptyObject(n)||this.setLinks(n),this.linkListen(),this.pushLink("add",((e,t)=>{this.setLink(e,t)})),$(".addLink").on("click touchstart",(e=>{e.preventDefault(),this.displayNewLinkForm()}));this.container.parent().on("submit","form.link-edit-form",(async function(t){t.preventDefault(),t.stopPropagation();const n=$(this).closest(".link-container"),i=$(this).closest(".link-edit-form"),o=n.data("linkid"),s=i.find("#hyperlink-text").val();let a=i.find("#hyperlink-url").val();const l=i.find("#hyperlink-text-hidden").val();i.find(".link-text-text-old").val(s);const c=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]'),d=`.${o}`,p=e.ace;p.callWithAce((e=>{const t=e.ace_getRepFromSelector(d,c);l!==s&&(e.ace_replaceRange(t[0][0],t[0][1],s),l.length>s.length?t[0][1][1]-=l.length-s.length:l.length<s.length&&(t[0][1][1]+=s.length-l.length)),p.callWithAce((e=>{e.ace_performSelectionChange(t[0][0],t[0][1],!0),e.ace_setAttributeOnSelection("link",o)}))}),"editLinkedSelection",!0),/^http:\/\//.test(a)||/^https:\/\//.test(a)||(a=`http://${a}`);const h={};h.linkId=o,h.padId=clientVars.padId,h.linkText=s,h.oldLinkText=l,h.hyperlink=a;try{await e._send("updateLinkText",h)}catch(e){if("unauth"!==e.message)throw e;return}n.removeClass("editing"),e.updateLinkBoxText(o,s,a),r(o),e.padOuter.find(`#show-form-${o}`).show(),e.padOuter.find(`#edit-form-${o}`).hide(),n.attr({"data-loaded":!1}),e.setLinkNewText(o,s,a)})),this.container.on("click","#link-cancel-btn",(function(){const t=$(this).closest(".link-container")[0].id;e.padOuter.find(`#show-form-${t}`).show(),e.padOuter.find(`#edit-form-${t}`).hide(),r(t)}));let c;this.container.parent().on("click",".ep_hyperlink_docs_bubble_button_edit",(function(t){const n=$(this).closest(".link-container")[0].id;e.padOuter.find(`#show-form-${n}`).hide(),e.padOuter.find(`#edit-form-${n}`).show(),e.padOuter.find(`#edit-form-${n}`).find("#hyperlink-text").focus((function(){this.setSelectionRange(this.value.length,this.value.length)})).select(),clientVars.userAgent.isMobile&&(t=>{const n=$('iframe[name="ace_outer"]').contents().find("#outerdocbody").parent(),i=$("#mainHeader").innerHeight(),o=e.padOuter.find(`#edit-form-${t}`).closest(".link-container").offset().top-i-25;n.animate({scrollTop:o})})(n)})),this.container.parent().on("click",".ep_hyperlink_docs_bubble_button_copy",(function(e){const t=document.createElement("input");document.body.appendChild(t),t.value=this.getAttribute("data-hyperlink"),t.select(),document.execCommand("copy"),document.body.removeChild(t),$.gritter.add({text:"Link copied to clipboard"});const n=$(this).closest(".link-container")[0].id;r(n)})),this.container.parent().on("click",".ep_hyperlink_docs_bubble_button_delete",(async function(){const t=$(this).closest(".link-container")[0].id;e.deleteLink(t);const n=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]'),i=`.${t}`,o=e.ace;o.callWithAce((e=>{const t=e.ace_getRepFromSelector(i,n);$.each(t,((e,t)=>{o.callWithAce((e=>{e.ace_performSelectionChange(t[0],t[1],!0),e.ace_setAttributeOnSelection("link","link-deleted")}))}))}),"deleteLinkedSelection",!0);try{await e._send("deleteLink",{padId:e.padId,linkId:t,authorId:clientVars.userId})}catch(e){if("unauth"!==e.message)throw e;return}})),this.container.on("mouseover",".sidebar-link",(e=>{clearTimeout(c)})).on("mouseout",".sidebar-link",(e=>{c=setTimeout((()=>{const t=e.currentTarget.id;r(t)}),3e3)})),this.padInner.contents().on("click",".link",(n=>{n.preventDefault(),clearTimeout(c);const l=e.linkIdOf(n);fetch(`/pluginfw/hyperlink/${clientVars.padId}/links/${l}`).then((e=>e.json())).then((c=>{const d={...c.link,linkId:l};((e,n,l)=>{const c=$('iframe[name="ace_outer"]').contents(),d=i().find('iframe[name="ace_inner"]'),p=n.linkId,h=0!==o().find(`#${p}`).length;if(s(),!n.hyperlink)return console.error("[hyperlink]: link does not exist",n),!1;let u=o().find(`#${p}`);h||(u=$("#linkBoxTemplate").tmpl({...n}));const k=u.attr("data-loaded");h?(u.show(),n.hyperlink!==u.find("a.ep_hyperlink_title").attr("href")&&u.attr("data-loaded","false"),u.attr("data-hyperlink",n.hyperlink),u.find("input#hyperlink-url").val(n.hyperlink),u.find("a.ep_hyperlink_title").attr({title:n.hyperlink,href:n.hyperlink})):c.find("#linkBoxWrapper").append(u);const f=d.contents().find(`.${p}`).text();if(u.find("input#hyperlink-text-hidden").val(f),u.find("input#hyperlink-text").val(f),"true"!==k){let e,i=n.hyperlink||u.attr("data-hyperlink");try{e=new URL(i)}catch(e){return console.error(`[hyperlink]: ${e}`),void r(p)}const o=u.find("#ep_hyperlink_img"),s=u.find("a.ep_hyperlink_title"),a=u.find("#card_loading_hyperlink"),c=u.find("#ep_hyperlink_description");c.text(""),s.text(i),o.hide(),s.show(),a.show(),/^http:\/\//.test(i)||/^https:\/\//.test(i)||(i=`https://${i}`);const d=(e,t,n)=>{o.attr("src",n),o.on("load",(()=>{a.fadeOut(500,(()=>{o.fadeIn(),s.text(t.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),c.text(e.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),u.attr({"data-loaded":!0})}))}))};if(!t(i))return d(i,i,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png"),!1;const h=t=>{if(t.metadata.image&&t.metadata.title)d(i,t.metadata.title,t.metadata.image);else{const n=`https://${e.hostname}`;!0!==t.last?l.emit("metaResolver",{padId:clientVars.padId,editedHyperlink:n,last:!0},h):d(i,t.metadata.title||i,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png")}};e.hostname.indexOf("twitter.com")>=0?d(i,"Twitter","../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png"):e.protocol.indexOf("mailto")>=0?d(i,"Send email","../static/plugins/ep_full_hyperlinks/static/dist/img/envelope.svg"):e.protocol.indexOf("skype")>=0?d(i,"Open Skype","../static/plugins/ep_full_hyperlinks/static/dist/img/skype.svg"):l.emit("metaResolver",{padId:clientVars.padId,hyperlink:i,last:!1},h)}a(e,u,d),u.addClass("hyperlink-display")})(n,d,e.socket)}))})),this.container.parent().on("click","a.ep_hyperlink_title",l),this.addListenersToCloseOpenedLink(),$("#options-links").trigger("change"),e.padInner.contents().on("copy",(t=>{m(t,e.padInner,!1,e.links)})),e.padInner.contents().on("cut",(t=>{m(t,e.padInner,!0,e.links)})),e.padInner.contents().on("paste",(t=>{g(t,e.padInner)}))},x.prototype.linkListen=function(){this.socket.on("pushAddLinkInBulk",(async()=>{const e=await this.getLinks();if(!$.isEmptyObject(e)){const t={};for(const n in e)Object.hasOwn(e,n)||(t[n]={},t[n].data=e[n]);this.Links=t}}))},x.prototype.findContainers=function(){const e=$('iframe[name="ace_outer"]').contents();this.padOuter=e,this.padInner=e.find('iframe[name="ace_inner"]'),this.outerBody=e.find("#outerdocbody")},x.prototype.setLinkNewText=function(e,t,n){this.links[e]?(this.links[e].data.text=t,this.links[e].data.hyperlink=n):this.linkReplies[e]&&(this.linkReplies[e].text=t,this.linkReplies[e].hyperlink=n)},x.prototype.addListenersToCloseOpenedLink=function(){const e=this;$(document).on("touchstart click",(t=>{e.closeOpenedLinkIfNotOnSelectedElements(t)})),this.padOuter.find("html").on("touchstart click",(t=>{e.closeOpenedLinkIfNotOnSelectedElements(t)})),this.padInner.contents().find("html").on("touchstart click",(t=>{e.closeOpenedLinkIfNotOnSelectedElements(t)}))},x.prototype.closeOpenedLink=function(e){s()},x.prototype.closeOpenedLinkIfNotOnSelectedElements=function(e){(e=>!!($(e.target).closest(".link").length||$(e.target).closest(".link-modal").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_edit").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_delete").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_copy").length||$(e.target).closest(".full-display-link").length||$(e.target).closest(".link-title-wrapper").length||$(e.target).closest(".link-edit-form").length||$(e.target).closest(".link-text-text").length||$(e.target).closest(".link-text-hyperlink").length))(e)||this.closeOpenedLink(e)},x.prototype.linkIdOf=function(e){const t=e.currentTarget.classList,n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t);return n?n[1]:null},x.prototype.insertContainers=function(){const e=$('iframe[name="ace_outer"]').contents().find("#outerdocbody").prepend('<div id="linkBoxWrapper"></div>');this.container=e},x.prototype.setLinks=function(e){for(const t in e)this.setLink(t,e[t])},x.prototype.setLink=function(e,t){const n=this.links;t.formattedDate=new Date(t.timestamp).toISOString(),null==n[e]&&(n[e]={}),n[e].data=t},x.prototype.setLinkNewText=function(e,t,n){this.links[e]&&(this.links[e].data.text=t,this.links[e].data.hyperlink=n)},x.prototype.getLinks=async function(){return(await this._send("getLinks",{padId:this.padId})).links},x.prototype.getLinkData=function(){const e={};return e.padId=this.padId,e.link={},e.link.author=clientVars.userId,e.link.name=pad.myUserInfo.name,e.link.timestamp=(new Date).getTime(),void 0===e.link.name&&(e.link.name=clientVars.userAgent),e},x.prototype.deleteLink=function(e){$('iframe[name="ace_outer"]').contents().find(`#${e}`).remove()},x.prototype.displayNewLinkForm=function(){const e=this,t={};this.ace.callWithAce((e=>{const n=e.ace_getRep();t.lines=n.lines,t.selStart=n.selStart,t.selEnd=n.selEnd}),"saveLinkedSelection",!0);const n=e.getSelectedText(t);if(0===n.length)return void $.gritter.add({text:"Please first select the text to link"});e.createNewLinkFormIfDontExist(t),$("body").hasClass("mobileView")||$("#newLink").css("left",$(".toolbar .addLink").offset().left),$("#newLink").find("textarea").val(""),$("#newLink").find(".link-content, .to-value").removeClass("error"),$("#newLink").addClass("popup-show"),pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText(),setTimeout((()=>$("#newLink #hyperlink-url").focus().select()),500);const i=e.getFirstElementSelected();e.isElementInViewport(i)||e.scrollViewportIfSelectedTextIsNotVisible(i),$("#newLink").find("#hyperlink-text").val(n),$("#newLink").find("#hyperlink-text-hidden").val(n)},x.prototype.scrollViewportIfSelectedTextIsNotVisible=function(e){const t=e.offsetTop,n=$('iframe[name="ace_outer"]').contents();n.find("#outerdocbody").scrollTop(t),n.find("#outerdocbody").parent().scrollTop(t)},x.prototype.isElementInViewport=function(e){const t=e.getBoundingClientRect(),n=$('iframe[name="ace_outer"]').contents().find("#outerdocbody").parent().scrollTop(),i=$('iframe[name="ace_outer"]').contents().find("#outerdocbody").scrollTop()||n,o=t.top-i,r=t.bottom-i,s=$('iframe[name="ace_outer"]'),a=s.height(),l=this.getIntValueOfCSSProperty(s,"padding-top");return!(o<0||r>a-l)},x.prototype.getIntValueOfCSSProperty=function(e,t){const n=e.css(t);return parseInt(n)||0},x.prototype.getFirstElementSelected=function(){let e;return this.ace.callWithAce((t=>{const n=t.ace_getRep(),i=`#${n.lines.atIndex(n.selStart[0]).key}`,o=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]').contents();e=o.find(i)}),"getFirstElementSelected",!0),e[0]},x.prototype.checkNoTextSelected=function(e){return e.selStart[0]===e.selEnd[0]&&e.selStart[1]===e.selEnd[1]},x.prototype.createNewLinkFormIfDontExist=function(e){const t=this.getLinkData(),n=this;p(t,((i,o)=>{t.link.oldText=i.oldText,t.link.text=i.text,t.link.hyperlink=i.hyperlink,n.saveLink(t,e)}))},x.prototype.getSelectedText=function(e){const t=[],n=this.getLastLine(e.selStart[0],e);for(let i=e.selStart[0];i<=n;++i){const n=e.lines.atIndex(i);if(e.selStart[0]>i||e.selStart[0]===i&&e.selStart[1]>=n.text.length)continue;if(e.selEnd[0]<i||e.selEnd[0]===i&&e.selEnd[1]<=0)continue;const o=e.selStart[0]<i||e.selStart[1]<0?0:e.selStart[1],r=e.selEnd[0]>i||e.selEnd[1]>n.text.length?n.text.length:e.selEnd[1];t.push(n.text.substring(0===o&&this.lineHasMarker(n)?1:o,r))}return t.join("\n")},x.prototype.getLastLine=function(e,t){let n=t.selEnd[0];return n>e&&this.lastLineSelectedIsEmpty(t,n)&&n--,n},x.prototype.lastLineSelectedIsEmpty=function(e,t){const n=e.lines.atIndex(t),i=this.lineHasMarker(n)?1:0;return e.selEnd[1]===i},x.prototype.lineHasMarker=function(e){return 1===e.lineMarker},x.prototype.cleanLine=function(e,t){return this.lineHasMarker(e)&&(t=t.substring(1)),t},x.prototype.saveLink=async function(e,t){const n=await this._send("addLink",e);if(null==n)return;const[i,o]=n;o.linkId=i,this.ace.callWithAce((e=>{t=e.ace_getRep(),e.ace_performSelectionChange(t.selStart,t.selEnd,!0),e.ace_setAttributeOnSelection("link",i)}),"insertLink",!0),this.setLink(i,o)},x.prototype.saveLinkWithoutSelection=async function(e,t){const n=this.buildLinks(t),i=await this._send("bulkAddLink",e,n);this.setLinks(i)},x.prototype.buildLinks=function(e){const t=[];for(const n in e)if(!Object.hasOwn(e,n)){const i=this.buildLink(n,e[n].data);t.push(i)}return t},x.prototype.buildLink=function(e,t){const n={};return n.padId=this.padId,n.linkId=e,n.text=t.text,n.hyperlink=t.hyperlink,n.changeTo=t.changeTo,n.changeFrom=t.changeFrom,n.name=t.name,n.timestamp=parseInt(t.timestamp),n},x.prototype._send=async function(e,...t){return await new Promise(((n,i)=>{this.socket.emit(e,...t,((e,t)=>{if(null!=e)return i(Object.assign(new Error(e.message),{name:e.name}));n(t)}))}))},x.prototype.getMapfakeLinks=function(){return this.mapFakeLinks},x.prototype.findLinkText=function(e){return e.find(".compact-display-content .link-text-text, .full-display-link .link-title-wrapper .link-text-text")},x.prototype.findHyperLinkText=function(e){return e.find(".compact-display-content .link-text-hyperlink, .full-display-link .link-title-wrapper .link-text-hyperlink")},x.prototype.updateLinkBoxText=function(e,t,n){const i=this.container.parent().find(`[data-linkid='${e}']`);i.attr("data-hyperlink",n);this.findLinkText(i).val(t);this.findHyperLinkText(i).val(n)},x.prototype.showChangeAsAccepted=function(e){const t=this,n=this.container.parent().find(`[data-linkid='${e}']`);n.closest(".sidebar-link").find(".link-container.change-accepted").addBack(".change-accepted").each((function(){$(this).removeClass("change-accepted");const e={linkId:$(this).attr("data-linkid"),padId:t.padId};t._send("revertChange",e)})),n.addClass("change-accepted")},x.prototype.showChangeAsReverted=function(e){this.container.parent().find(`[data-linkid='${e}']`).removeClass("change-accepted")},x.prototype.pushLink=function(e,t){const n=this.socket,i=this;n.on("textLinkUpdated",((e,t,n)=>{i.updateLinkBoxText(e,t,n)})),n.on("linkDeleted",(e=>{i.deleteLink(e)})),n.on("changeAccepted",(e=>{i.showChangeAsAccepted(e)})),n.on("changeReverted",(e=>{i.showChangeAsReverted(e)})),"add"===e&&n.on("pushAddLink",((e,n)=>{t(e,n)}))};function _(e,t){const n=this.documentAttributeManager,i=[],o=t.contents().find(e);return $.each(o,((e,t)=>{const o=[[],[]],r=$(t).closest("div"),s=$(r).prevAll("div").length;o[0][0]=s,o[1][0]=s;let a=0,l=!1;const c=n.getAttributesOnLine(s);$.each(c,((e,t)=>{"lmkr"===t[0]&&(l=!0)})),l&&a++,$(t).prevAll("span").each((function(){const e=$(this).text().length;a+=e})),o[0][1]=a,o[1][1]=o[0][1]+$(t).text().length,i.push(o)})),i}const L=(e,t,n)=>y,b=(e,t)=>{pad.plugins||(pad.plugins={});const n=new x(t);return pad.plugins.ep_full_hyperlinks=n,$("#editorcontainerbox").hasClass("flex-layout")||$.gritter.add({title:"Error",text:"ep_full_hyperlinks: Please upgrade to etherpad 1.8.3 for this plugin to work correctly",sticky:!0,class_name:"error"}),[]},w=(e,t,n)=>"link"===t.key&&"link-deleted"!==t.value?["link",t.value]:t.key===h&&t.value===clientVars.userId?[h,t.value]:[],v=(e,t)=>{pad.plugins||(pad.plugins={});const n=t.callstack.editEvent.eventType;if("setup"!==n&&"setBaseText"!==n&&"importText"!==n)return"unmarkPreSelectedTextToLink"===n?pad.plugins.ep_full_hyperlinks.preLinkMarker.handleUnmarkText(t):"markPreSelectedTextToLink"===n&&pad.plugins.ep_full_hyperlinks.preLinkMarker.handleMarkText(t),[]},I=(e,t)=>{const n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t.cls),i=/(?:^| )(fakelink-[A-Za-z0-9]*)/.exec(t.cls);if(n&&n[1]&&t.cc.doAttrib(t.state,`link::${n[1]}`),i){const e=pad.plugins.ep_full_hyperlinks.getMapfakeLinks()[i[1]];t.cc.doAttrib(t.state,`link::${e}`)}return[]};exports.aceAttribsToClasses=w,exports.aceEditEvent=v,exports.aceEditorCSS=L,exports.aceInitialized=(e,t)=>{t.editorInfo.ace_getRepFromSelector=_.bind(t)},exports.acePostWriteDomLineHTML=(e,t)=>{const n=$(t.node).find("a");n.length>0&&n.each((function(){$(this).on("click",l)}))},exports.collectContentPre=I,exports.postAceInit=b;//# sourceMappingURL=bundle.js.map
