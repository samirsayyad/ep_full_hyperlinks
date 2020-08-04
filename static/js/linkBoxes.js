// Easier access to outter pad
var padOuter;
var getPadOuter = function() {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
}

var getLinksContainer = function() {
  return getPadOuter().find("#links");
}

/* ***** Public methods: ***** */

var showLink = function(linkId, e) {
  var linkElm = getLinksContainer().find('#'+ linkId);
  linkElm.show();

  highlightLink(linkId, e);
};

var hideLink = function(linkId, hideLinkTitle) {
  var linkElm = getLinksContainer().find('#'+ linkId);
  if (linkElm.hasClass("hyperlink-display") ){
    console.log(linkElm.css("top"))
    linkElm.css({top:  parseInt(linkElm.css("top").split('px')[0]) - 35 + "px"  })
    linkElm.removeClass('hyperlink-display');
  }


  // hide even the link title
  //if (hideLinkTitle) linkElm.fadeOut();

  var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  inner.contents().find("head .link-style").remove();

  getPadOuter().find('.link-modal').removeClass('popup-show');
};

var hideAllLinks = function() {
  // getLinksContainer().find('.sidebar-link').removeClass('full-display');
  // getPadOuter().find('.link-modal').removeClass('popup-show');
  var container       = getLinksContainer();
  var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');

  container.find('.sidebar-link').each(function() {
    inner.contents().find("head .link-style").remove();
    if ($(this).hasClass("hyperlink-display")){
      $(this).removeClass('hyperlink-display')
      
    }
  });
}

var highlightLink = function(linkId, e, editorLink,socket){
  var container       = getLinksContainer();
  var linkElm      = container.find('#'+ linkId);
  var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');



  if (container.is(":visible")) {
    // hide all other links
    container.find('.sidebar-link').each(function() {
      inner.contents().find("head .link-style").remove();
      if ($(this).attr("data-linkid") != linkId){
        if ($(this).hasClass("hyperlink-display") ){
          $(this).removeClass('hyperlink-display')
          $(this).css({top:  parseInt($(this).css("top").split('px')[0]) - 35 + "px"  })
        }
      }

    });

    console.log(linkElm,"we want show this ? ",linkElm.hasClass("hyperlink-display"),editorLink)
    if (!linkElm.hasClass("hyperlink-display")){
      var ep_hyperlink_title      = linkElm.find('#ep_hyperlink_title');
      var ep_hyperlink_img      = linkElm.find('#ep_hyperlink_img');
      var card_loading_hyperlink      = linkElm.find('#card_loading_hyperlink');

      ep_hyperlink_img.hide()
      ep_hyperlink_title.hide()
      card_loading_hyperlink.show()




      console.log(linkElm.css("top").split('px')[0]  )
      linkElm.css({"left":parseInt(editorLink.position().left) + parseInt(linkElm.css("width").split('px')[0]/4) + "px"   })
      linkElm.css({top:  parseInt(linkElm.css("top").split('px')[0]) + 35 + "px"  })
      linkElm.addClass('hyperlink-display');
      //raise for og:title resolving
      console.log(linkElm,"hyspe")

      var hyperlink =linkElm.data("hyperlink") ;
      console.log(hyperlink,"hype")


      
      socket.emit('metaResolver', {padId: self.padId,hyperlink : hyperlink}, function (res){
        console.log("metaResolver",res);
        if(res){

          ep_hyperlink_title.text(res.title)
          ep_hyperlink_title.attr('href',hyperlink);
  
          var image = null ;
  
          if(res.image )
            image = res.image 
            
          else 
            {
              if (res.images){
                console.log(res.images)
                $.each(res.images,function(key,value){
                  if(isUrlValid(value) && notInTheseUrls(value)){
                    image = value;
                    return false;
                  }
                });
              }
            }
          if(isUrlValid(image)){
            ep_hyperlink_img.attr('src',image);
          }else{
            if(isUrlValid(res.url+image)){
              ep_hyperlink_img.attr('src',res.url+image);
            }else{
              ep_hyperlink_img.attr('src',res.uri.scheme+"://"+res.uri.host+image);
  
            }
          }
          console.log(image,"going to be set ")
  
          ep_hyperlink_img.on("load",function(){
            
            card_loading_hyperlink.fadeOut( "slow", function() {
              ep_hyperlink_img.fadeIn()
              ep_hyperlink_title.fadeIn()
              
              // Animation complete.
            })
          }) 
        }else{
          console.log("not loaded",res)
        }
        
        
      });



    }
    // else{
    //   linkElm.removeClass('hyperlink-display');
    //   linkElm.css({top:  parseInt(linkElm.css("top").split('px')[0]) - 40 + "px"  })
  
    // }
    // Then highlight new link

    // now if we apply a class such as mouseover to the editor it will go shitty
    // so what we need to do is add CSS for the specific ID to the document...
    // It's fucked up but that's how we do it..
    var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    inner.contents().find("head").append("<style class='link-style'>."+linkId+"{ color: #a7680c !important }</style>");
  } else {
    
    // make a full copy of the html, including listeners
    var linkElmCloned = linkElm.clone(true, true);

    // before of appending clear the css (like top positionning)
    linkElmCloned.attr('style', '');
    // fix checkbox, because as we are duplicating the sidebar-link, we lose unique input names
    linkElmCloned.find('.label-suggestion-checkbox').click(function() {
      $(this).siblings('input[type="checkbox"]').click();
    })

    // hovering link view
    getPadOuter().find('.link-modal-link').html('').append(linkElmCloned);
    var padInner = getPadOuter().find('iframe[name="ace_inner"]')
    // get modal position
    var containerWidth = getPadOuter().find('#outerdocbody').outerWidth(true);
    var modalWitdh = getPadOuter().find('.link-modal').outerWidth(true);
    var targetLeft = e.clientX;
    var targetTop = $(e.target).offset().top;
    if (editorLink) {
      targetLeft += padInner.offset().left;
      targetTop += parseInt(padInner.css('padding-top').split('px')[0])
      targetTop += parseInt(padOuter.find('#outerdocbody').css('padding-top').split('px')[0])
    } else {
      // mean we are clicking from a link Icon
      var targetLeft = $(e.target).offset().left - 20;
    }

    // if positioning modal on target left will make part of the modal to be
    // out of screen, we place it closer to the middle of the screen
    if (targetLeft + modalWitdh > containerWidth) {
      targetLeft = containerWidth - modalWitdh - 25;
    }
    var editorLinkHeight = editorLink ? editorLink.outerHeight(true) : 30;
    console.log(editorLinkHeight,targetTop + editorLinkHeight)
    getPadOuter().find('.link-modal').addClass('popup-show').css({
      left: targetLeft + "px",
      top: targetTop + editorLinkHeight +"px"
    });
  }
}

// Adjust position of the link detail on the container, to be on the same
// height of the pad text associated to the link, and return the affected element
var adjustTopOf = function(linkId, baseTop) {
  var linkElement = getPadOuter().find('#'+linkId);
  linkElement.css("top", baseTop+"px");

  return linkElement;
}

// Indicates if link is on the expected position (baseTop-5)
var isOnTop = function(linkId, baseTop) {
  var linkElement = getPadOuter().find('#'+linkId);
  var expectedTop = baseTop + "px";
  return linkElement.css("top") === expectedTop;
}

var isUrlValid = function(url) {
  return /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
}
var notInTheseUrls  = function(url) {
  if(url == "https://www.google.com/tia/tia.png")
    return false ;
  return true
}

// Indicates if event was on one of the elements that does not close link
var shouldNotCloseLink = function(e) {
  // a link box
  if ($(e.target).closest('.sidebar-link').length || $(e.target).closest('.link-modal').length) { // the link modal
    return true;
  }
  return false;
}

exports.showLink = showLink;
exports.hideLink = hideLink;
exports.hideAllLinks = hideAllLinks;
exports.highlightLink = highlightLink;
exports.adjustTopOf = adjustTopOf;
exports.isOnTop = isOnTop;
exports.shouldNotCloseLink = shouldNotCloseLink;
