exports.moduleList=(()=>{const e=require("ep_etherpad-lite/static/js/pad_utils").randomString,t=require("ep_etherpad-lite/static/js/underscore"),n=(i=function(e,n){let i={};return t.each(n,n=>{i=t.extend(s(e,n),i)}),i},s=function(e,n){const i={};return t.each(e,(e,t)=>{e.linkId===n&&(i[t]=e)}),i},o=function(e,n){const i=function(e){const n={};return t.each(e,(e,t)=>{const i=e.data.originalLinkId;n[i]=t}),n}(e);return t.each(i,(e,t)=>{$(n).find("."+t).removeClass(t).addClass(e)}),d(n)},a=function(e,n){const i={},s=r(e);return t.each(s,e=>{const t=l(),s=n[e];s.data.originalLinkId=e,i[t]=s}),i},l=function(){return"fakelink-"+e(16)},r=function(e){const n=$(e).find("span"),i=[];return t.each(n,e=>{const t=$(e).attr("class"),n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t),s=!!n&&n[1];s&&i.push(s)}),t.uniq(i)},c=function(e){const t=e.cloneContents(),n=document.createElement("div");return $(n).html(t)},d=function(e){return $(e).html()},p=function(e){const t=d(e);return w(t)===$(e).text()},u=function(e,t,n){const i=h(e,n),s=f(i,t);return $.parseHTML(`<div>${s}</div>`)},f=function(e,t){const n=t.commonAncestorContainer.parentNode,i=g(n);return i&&(e=k(i)+e+m(i)),e},h=function(e,t){return`<span class="link ${t}">${e.slice(0,-1)}</span><span class="link ${t}">${e.slice(-1)}</span>`},k=function(e){let t="";return e.forEach(e=>{t+=`<${e}>`}),t},m=function(e){let t="";return(e=e.reverse()).forEach(e=>{t+=`</${e}>`}),t},g=function(e){const t=[];let n;if($(e)[0].hasOwnProperty("localName"))for(;"span"!==$(e)[0].localName;){const i=$(e).prop("outerHTML"),s=/<(b|i|u|s)>/.exec(i);n=s?s[1]:"",t.push(n),e=$(e).parent()}return t},y=function(e){console.log("saveLinks1",e);const n={},i=clientVars.padId,s=pad.plugins.ep_full_hyperlinks.mapOriginalLinksId,o=pad.plugins.ep_full_hyperlinks.mapFakeLinks;t.each(e,(e,t)=>{v(e,t);const i=G.generateLinkId();o[t]=i;const a=e.data.originalLinkId;s[a]=i,n[i]=e}),console.log("saveLinks2",i,n),pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(i,n)},_=function(e){const n={},i=clientVars.padId,s=pad.plugins.ep_full_hyperlinks.mapOriginalLinksId;t.each(e,(e,t)=>{const i=e.linkId;e.linkId=s[i],n[t]=e}),pad.plugins.ep_full_hyperlinks.saveLinkReplies(i,n)},v=function(e,t){const n={};return n.padId=clientVars.padId,n.link=e.data,n.link.linkId=t,n},w=function(e){const t=document.createElement("div");return t.innerHTML=e,0===t.childNodes.length?"":t.childNodes[0].nodeValue},x=function(e,t,n,i){let s=!1;for(let o=e;o<=t&&!s;o++){const a=L(o,n,e),l=b(o,n,t);I(o,a,l,i)&&(s=!0)}return s},L=function(e,t,n){return e!==n?0:t.selStart[1]},b=function(e,t,n){let i;return i=e!==n?S(e,t):t.selEnd[1]-1,i},I=function(e,n,i,s){let o=!1;for(let a=n;a<=i&&!o;a++)void 0!==t.object(s.getAttributesOnPosition(e,a)).link&&(o=!0);return o},T=function(e,t){return e!==t},S=function(e,t){const n=e+1,i=t.lines.offsetOfIndex(e);return t.lines.offsetOfIndex(n)-i-1},{addTextOnClipboard:function(e,t,n,s,l,d){let f,h;if(t.callWithAce(e=>{f=e.ace_getLinkIdOnFirstPositionSelected(),h=e.ace_hasLinkOnSelection()}),h){let t;const h=n.contents()[0].getSelection().getRangeAt(0),k=c(h);let m=k;if(p(k)){const e=k[0].textContent;m=u(e,h,f)}const g=r(m);t=a(m,l);const y=o(t,m);t=JSON.stringify(t);let _=i(d,g);_=JSON.stringify(_),e.originalEvent.clipboardData.setData("text/objectReply",_),e.originalEvent.clipboardData.setData("text/objectLink",t),e.originalEvent.clipboardData.setData("text/html",y),e.preventDefault(),s&&n.contents()[0].execCommand("delete")}},saveLinksAndReplies:function(e,t){let n=e.originalEvent.clipboardData.getData("text/objectLink"),i=e.originalEvent.clipboardData.getData("text/objectReply");if(n&&i)n=JSON.parse(n),console.log(n,"links"),i=JSON.parse(i),y(n),_(i);else{var s,o="";if(s=(e.originalEvent.clipboardData||window.clipboardData).getData("text"),!t.contents()[0].getSelection().getRangeAt(0))return!1;if(console.log(s),new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(s)){var a=s.match(/(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi),l={};if(a){for(match in a.reverse()){var c={},d=G.generateLinkId();c.link=a[match],l[d]={data:{author:"empty",linkId:d,reply:!1,timestamp:(new Date).getTime(),text:c.link,originalLinkId:d,hyperlink:c.link,headerId:null,date:new Date,formattedDate:new Date}},c.startsAt=s.indexOf(a[match]);var p='<span id="'+d+'" class="'+d+'">';s=[s.slice(0,c.startsAt),p,s.slice(c.startsAt)].join(""),c.endsAt=s.indexOf(a[match])+a[match].length,s=[s.slice(0,c.endsAt),"</span>",s.slice(c.endsAt)].join("")}s=s.replace(/(?:\r\n|\r|\n)/g,"<br>"),console.log("before",s),o=$("<div></div>").html(s);const n=r(o);console.log(n,"linkIds"),t.contents()[0].execCommand("insertHTML",!1,$("<div>").append($(o).clone()).html()),console.log("external",l),pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(clientVars.padId,l),e.preventDefault()}}}},getLinkIdOnFirstPositionSelected:function(){const e=this.documentAttributeManager,n=this.rep;return t.object(e.getAttributesOnPosition(n.selStart[0],n.selStart[1])).link},hasLinkOnSelection:function(){let e;const t=this.documentAttributeManager,n=this.rep,i=n.selStart[0],s=n.selStart[1],o=n.selEnd[1],a=n.selEnd[0];return e=T(i,a)?x(i,a,n,t):I(i,s,o,t),e}});var i,s,o,a,l,r,c,d,p,u,f,h,k,m,g,y,_,v,w,x,L,b,I,T,S;const C=(()=>{let e;const t=function(){return e=e||$('iframe[name="ace_outer"]').contents(),e},n=()=>t().find("#links");var i=function(i,s,o,a,l){const r=n(),c=r.find("#"+i);var d,p=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');if(r.find(".sidebar-link").each((function(){p.contents().find("head .link-style").remove(),$(this).attr("data-linkid")!=i&&$(this).hasClass("hyperlink-display")&&($(this).removeClass("hyperlink-display"),e.find("#edit-form-"+$(this).attr("data-linkid")).hide(),e.find("#show-form-"+$(this).attr("data-linkid")).show(),$(this).css({top:parseInt($(this).css("top").split("px")[0])-35+"px"}),$(this).css({top:c.attr("data-basetop")+"px"}))})),!c.hasClass("hyperlink-display")){c.css({width:"324px"});const n=c.attr("data-loaded"),i=t().find('iframe[name="ace_inner"]');let o=s.clientX;o+=i.offset().left;let r=$(s.target).offset().top;if(r+=parseInt(i.css("padding-top").split("px")[0]),r+=parseInt(e.find("#outerdocbody").css("padding-top").split("px")[0]),c.css({left:parseInt(o)+"px"}),c.css({top:parseInt(r)+35+"px"}),c.addClass("hyperlink-display"),"true"!=n){var u=c.attr("data-hyperlink");const e=new URL(u),t=c.find("#ep_hyperlink_title");t.text(u);const n=c.find("#ep_hyperlink_img"),i=c.find("#ep_hyperlink_description");i.text("");const s=c.find("#card_loading_hyperlink");n.hide(),t.show(),s.show(),/^http:\/\//.test(u)||/^https:\/\//.test(u)||(u="https://"+u);const o=function(e,o,a){n.attr("src",a),n.on("load",()=>{s.fadeOut(500,()=>{n.fadeIn(),t.text(o.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),i.text(e.replace(/^(?:https?:\/\/)?(?:www\.)?/i,"")),c.attr({"data-loaded":!0})})})};if(d=u,!new RegExp("^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$","i").test(d))return o(u,u,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png"),!1;const r=function(t){if(t.metadata.image&&t.metadata.title)o(u,t.metadata.title,t.metadata.image);else{var n="https://"+e.hostname;!0!==t.last?a.emit("metaResolver",{padId:l,editedHyperlink:n,last:!0},r):o(u,t.metadata.title||u,"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png")}};switch(e.hostname){case"twitter.com":o(u,u,"../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png");break;default:a.emit("metaResolver",{padId:l,hyperlink:u,last:!1},r)}}}(p=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]')).contents().find("head").append(`<style class='link-style'>.${i}{ color: #a7680c !important }</style>`)};return{showLink:function(e,t){n().find("#"+e).show(),i(e,t)},hideLink:function(i,s){const o=n().find("#"+i);o.hasClass("hyperlink-display")&&(o.css({top:o.attr("data-basetop")+"px"}),o.removeClass("hyperlink-display"),o.css({width:"324px"}),e.find("#edit-form-"+i).hide(),e.find("#show-form-"+i).show());$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]').contents().find("head .link-style").remove(),t().find(".link-modal").removeClass("popup-show")},hideAllLinks:function(){const t=n(),i=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');t.find(".sidebar-link").each((function(){i.contents().find("head .link-style").remove(),$(this).hasClass("hyperlink-display")&&($(this).removeClass("hyperlink-display"),$(this).css({width:"324px"}),e.find("#edit-form-"+$(this).attr("data-linkid")).hide(),e.find("#show-form-"+$(this).attr("data-linkid")).show(),$(this).css({top:$(this).attr("data-basetop")+"px"}))}))},highlightLink:i,adjustTopOf:function(e,n){const i=t().find("#"+e);return i.css("top",n+"px"),i.attr("data-basetop",n),i},isOnTop:function(e,n){const i=n+"px";return t().find("#"+e).css("top")===i},shouldNotCloseLink:function(e){return!!($(e.target).closest(".link").length||$(e.target).closest(".link-modal").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_edit").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_delete").length||$(e.target).closest(".ep_hyperlink_docs_bubble_button_copy").length||$(e.target).closest(".full-display-link").length||$(e.target).closest(".link-title-wrapper").length||$(e.target).closest(".link-edit-form").length||$(e.target).closest(".link-text-text").length||$(e.target).closest(".link-text-hyperlink").length)}}})(),A=(z=function(){return clientVars.displayLinkAsIcon},D=function(){return E=E||$('iframe[name="ace_outer"]').contents()},N=function(){return O=O||D().find('iframe[name="ace_inner"]').contents()},M=function(e){const t=D().find("#linkIcons"),n="icon-at-"+e;let i=t.find("."+n);return 0===i.length&&(t.append(`<div class="link-icon-line ${n}"></div>`),i=t.find("."+n),i.css("top",e+"px")),i},R=function(e){return e.currentTarget.getAttribute("data-linkid")},j=function(e){N().find("head .link-style").remove()},P=function(e){e.toggleClass("active").toggleClass("inactive")},V=function(){D().find("#linkIcons").on("mouseover",".link-icon",e=>{j(),function(e){N().find("head").append(`<style class='link-style'>.${e}{ color: #a7680c !important }</style>`)}(R(e))}).on("mouseout",".link-icon",e=>{R(e),j()}).on("click",".link-icon.active",(function(e){P($(this));const t=R(e);C.hideLink(t,!0)})).on("click",".link-icon.inactive",(function(e){C.hideAllLinks();const t=D().find("#linkIcons").find(".link-icon.active");P(t),P($(this));const n=R(e);C.highlightLink(n,e)}))},Z=function(e){if(H(e)||C.shouldNotCloseLink(e))return;const t=F();if(t){P($(t));const e=t.getAttribute("data-linkid");C.hideLink(e,!0)}},F=function(){return D().find("#linkIcons .link-icon.active").get(0)},{insertContainer:function(){z()&&(D().find("#sidediv").after('<div id="linkIcons"></div>'),D().find("#links").addClass("with-icons"),V(),$(document).on("touchstart click",e=>{Z(e)}),D().find("html").on("touchstart click",e=>{Z(e)}),N().find("html").on("touchstart click",e=>{Z(e)}))},addIcon:function(e,t){if(!z())return;const n=N().find(".link."+e).get(0).offsetTop,i=M(n);$("#linkIconTemplate").tmpl(t).appendTo(i)},hideIcons:function(){z()&&D().find("#linkIcons").children().children().each((function(){$(this).hide()}))},adjustTopOf:function(e,t){if(!z())return;const n=D().find("#icon-"+e),i=M(t);return i!=n.parent()&&n.appendTo(i),n.show(),n},isLinkOpenedByClickOnIcon:function(){return!!z()&&0!==D().find("#linkIcons").find(".link-icon.active").length},linkHasReply:function(e){z()&&D().find("#linkIcons").find("#icon-"+e).addClass("with-reply")},shouldShow:function(e){let t=!1;return z()?e.hasClass("mouseover")&&(t=!0):t=!0,t},shouldNotCloseLink:H=function(e){return 0!==$(e.target).closest(".link-icon").length}});var E,O,z,D,N,M,R,j,P,V,Z,F,H;const U={localize:function(e){html10n.translateElement(html10n.translations,e.get(0))}},W=(J=function(e){return!!new RegExp("^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$","i").test(e)},{localizenewLinkPopup:q=function(){const e=$("#newLink");0!==e.length&&U.localize(e)},insertNewLinkPopupIfDontExist:function(e,t){$("#newLink").remove();var n=$("#newLink");return e.linkId="",(n=$("#newLinkTemplate").tmpl(e)).appendTo($("#editorcontainerbox")),q(),$("#newLink").find(".suggestion-checkbox").change((function(){$("#newLink").find(".suggestion").toggle($(this).is(":checked"))})),n.find("#link-reset").on("click",()=>{K()}),$("#newLink").on("submit",e=>(e.preventDefault(),function(e){const t=$("#newLink"),n=function(e){const t=e.find("#hyperlink-text").val(),n=e.find("#hyperlink-text-hidden").val();let i=e.find("#hyperlink-url").val();const s=e.find(".from-value").text(),o=e.find(".to-value").val()||null,a={};return/^http:\/\//.test(i)||/^https:\/\//.test(i)||(i="https://"+i),a.text=t,a.oldText=n,a.hyperlink=i,o&&(a.changeFrom=s,a.changeTo=o),a}(t);return(n.text.length>0||n.changeTo&&n.changeTo.length>0)&&J(n.hyperlink)?(t.find(".link-content, .to-value").removeClass("error"),K(),e(n,0)):(0==n.text.length&&t.find(".link-content").addClass("error"),J(n.hyperlink)||t.find("#hyperlink-url").addClass("error"),n.changeTo&&0==n.changeTo.length&&t.find(".to-value").addClass("error")),!1}(t))),n},showNewLinkPopup:function(){$("#newLink").css("left",$(".toolbar .addLink").offset().left),$("#newLink").find(".suggestion-checkbox").prop("checked",!1).trigger("change"),$("#newLink").find("textarea").val(""),$("#newLink").find(".link-content, .to-value").removeClass("error"),$("#newLink").addClass("popup-show"),pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText(),setTimeout(()=>{$("#newLink").find(".link-content").focus().select()},500)},hideNewLinkPopup:K=function(){$("#newLink").removeClass("popup-show"),$("#newLink").find(":focus").blur(),pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText()}});var J,q,K;const B=(()=>{const e="pre-selected-link";var t=function(e){this.ace=e;const t=this;this.highlightSelectedText()&&setTimeout(()=>{t.unmarkSelectedText()},0)};t.prototype.highlightSelectedText=function(){return clientVars.highlightSelectedText},t.prototype.markSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(n,"markPreSelectedTextToLink",!0)},t.prototype.unmarkSelectedText=function(){this.highlightSelectedText()&&this.ace.callWithAce(n,"unmarkPreSelectedTextToLink",!0)},t.prototype.performNonUnduableEvent=function(e,t,n){t.startNewEvent("nonundoable"),n(),t.startNewEvent(e)},t.prototype.handleMarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i),this.addMark(t,i)},t.prototype.handleUnmarkText=function(e){const t=e.editorInfo,n=e.rep,i=e.callstack;this.removeMarks(t,n,i)},t.prototype.addMark=function(t,n){const i=n.editEvent.eventType;this.performNonUnduableEvent(i,n,()=>{t.ace_setAttributeOnSelection(e,clientVars.userId)})},t.prototype.removeMarks=function(t,n,i){const s=i.editEvent.eventType,o=n.selStart,a=n.selEnd;this.performNonUnduableEvent(s,i,()=>{const n=$('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]'),i=t.ace_getRepFromSelector(".pre-selected-link",n);$.each(i,(n,i)=>{t.ace_performSelectionChange(i[0],i[1],!0),t.ace_setAttributeOnSelection(e,!1)}),t.ace_performSelectionChange(o,a,!0)})};var n=function(){};return{MARK_CLASS:e,init:function(e){return new t(e)}}})(),X=(()=>{var e="undefined"!=typeof html10n;l10nKeys={seconds:"ep_full_hyperlinks.time.seconds","1 minute ago":"ep_full_hyperlinks.time.one_minute",minutes:"ep_full_hyperlinks.time.minutes","1 hour ago":"ep_full_hyperlinks.time.one_hour",hours:"ep_full_hyperlinks.time.hours",yesterday:"ep_full_hyperlinks.time.one_day",days:"ep_full_hyperlinks.time.days","last week":"ep_full_hyperlinks.time.one_week",weeks:"ep_full_hyperlinks.time.weeks","last month":"ep_full_hyperlinks.time.one_month",months:"ep_full_hyperlinks.time.months","last year":"ep_full_hyperlinks.time.one_year",years:"ep_full_hyperlinks.time.years","last century":"ep_full_hyperlinks.time.one_century",centuries:"ep_full_hyperlinks.time.centuries"};var t=[[60,"seconds",1],[120,"1 minute ago","1 minute from now"],[3600,"minutes",60],[7200,"1 hour ago","1 hour from now"],[86400,"hours",3600],[172800,"yesterday","tomorrow"],[604800,"days",86400],[1209600,"last week","next week"],[2419200,"weeks",604800],[4838400,"last month","next month"],[29030400,"months",2419200],[58060800,"last year","next year"],[290304e4,"years",29030400],[580608e4,"last century","next century"],[580608e5,"centuries",290304e4]];return{prettyDate:function(n){let i=(new Date-new Date(n))/1e3,s="ago",o=1,a=".past";i<0&&(i=Math.abs(i),s="from now",a=".future",o=2);let l,r=0;for(;l=t[r++];)if(i<l[0]){const t=Math.floor(i/l[2]);var c;if(e){const e=l10nKeys[l[1]]+a;c=html10n.get(e,{count:t})}return void 0===c&&(c="string"==typeof l[2]?l[o]:`${t} ${l[1]} ${s}`),c}return n}}})(),G={collectContentPre:(e,t)=>{const n=/(?:^| )(lc-[A-Za-z0-9]*)/.exec(t.cls),i=/(?:^| )(fakelink-[A-Za-z0-9]*)/.exec(t.cls);if(n&&n[1]&&t.cc.doAttrib(t.state,"link::"+n[1]),i){console.log(i,"fakeLink");const e=pad.plugins.ep_full_hyperlinks.getMapfakeLinks()[i[1]];t.cc.doAttrib(t.state,"link::"+e)}return[]},generateLinkId:function(){return"lc-"+e(16)}};return{events:n,linkBoxes:C,linkIcons:A,linkL10n:U,newLink:W,preLinkMark:B,timeFormat:X,shared:G}})();
//# sourceMappingURL=ep.full.hyperlinks.mini.js.map
