define(function(){ return '\
/********************************/\
/* iOS theme for all Lists      */\
/*                              */\
/* IMPORTANT: a renderer MUST       */\
/* have the same height (inc.   */\
/* borders) whatever its index  */\
/* in the list !                */\
/********************************/\
.d-list-category {\
  position: relative;\
  margin: 0;\
  padding: 0 10px;\
  overflow: hidden;\
  font-family: Helvetica;\
  font-size: 16px;\
  font-weight: bold;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  height: 22px;\
  border-top: 1px solid #a4b0b9;\
  border-bottom: 1px solid #979da3;\
  background-image: -webkit-gradient(linear, left top, left bottom, from(#8f9ea9), to(#b7c0c7));\
  background-image: linear-gradient(to bottom, #8f9ea9 0%, #b7c0c7 100%);\
  color: white;\
  line-height: 22px;\
  text-shadow: rgba(0, 0, 0, 0.6) 0 -1px 0;\
}\
.d-list-item {\
  overflow: hidden;\
  /* for focus frame */\
  padding: 0 8px;\
  list-style-type: none;\
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0);\
  border-bottom: 1px solid #adaaad;\
  background-color: #ffffff;\
  display: -webkit-box;\
  display: -moz-box;\
  display: -ms-flexbox;\
  display: -webkit-flex;\
  display: flex;\
}\
.d-list-item-node {\
  -webkit-box-flex: 1;\
  -moz-box-flex: 1;\
  -webkit-flex: 1;\
  -ms-flex: 1;\
  flex: 1;\
}\
.d-list-item-label {\
  position: relative;\
  overflow: hidden;\
  white-space: nowrap;\
  text-overflow: ellipsis;\
  font-weight: bold;\
  height: 43px;\
  line-height: 43px;\
}\
.d-list-item-right-text {\
  position: relative;\
  float: right;\
  line-height: normal;\
  margin-right: 4px;\
  font-weight: bold;\
  color: #324f85;\
  margin-top: 12px;\
}\
.d-list-item-icon {\
  position: relative;\
  float: left;\
  line-height: normal;\
  margin-top: 7px;\
  margin-bottom: -7px;\
  margin-right: 11px;\
  vertical-align: top;\
}\
.d-list-item-right-icon,\
.d-list-item-right-icon2 {\
  position: relative;\
  float: right;\
  line-height: normal;\
  margin-top: 7px;\
  margin-bottom: -7px;\
}\
.d-list-loader {\
  padding: 0 8px;\
  color: blue;\
  cursor: pointer;\
  height: 43px;\
  line-height: 43px;\
  background-color: #ffffff;\
  border-bottom: 1px solid #adaaad;\
}\
.d-list-loader.d-loading {\
  color: #808080;\
  cursor: wait;\
}\
.d-list-loading-panel {\
  position: absolute;\
  color: #808080;\
  font-size: xx-large;\
  font-style: italic;\
  text-align: center;\
  background-color: #c5ccd3;\
  cursor: wait;\
}\
/* TODO: REMOVE THE TWO FOLLOWING CLASSES AND USE A LOADING PANEL INSTEAD ? */\
.d-list.d-loading {\
  padding-top: 50px;\
  text-align: center;\
}\
.d-list.d-loading:after {\
  content: "Loading...";\
  font-size: large;\
  font-style: italic;\
  color: #808080;\
}\
/*******************************/\
/* iOS theme for RoundRectList */\
/*                             */\
/* IMPORTANT: a renderer MUST      */\
/* have the same height (inc.  */\
/* borders) whatever its index */\
/* in the list !               */\
/*******************************/\
.d-round-rect-list {\
  position: relative;\
  /* needed for moving list items in editable mode */\
  margin: 0 9px !important;\
  padding: 0;\
  overflow-x: hidden;\
  overflow-y: hidden;\
}\
.d-round-rect-list > *:first-child {\
  border-top-left-radius: 8px;\
  border-top-right-radius: 8px;\
}\
.d-round-rect-list > *:last-child {\
  border-bottom-width: 0;\
  padding-bottom: 1px;\
  /* to compensate the fact that the bottom width is 0 instead of 1 */\
  border-bottom-left-radius: 8px;\
  border-bottom-right-radius: 8px;\
}\
.d-round-rect-list > .d-selected {\
  color: #ffffff;\
  background-image: -webkit-gradient(linear, left top, left bottom, from(#048bf4), to(#005ce5));\
  background-image: linear-gradient(to bottom, #048bf4 0%, #005ce5 100%);\
}\
/********************************/\
/* iOS theme for EdgeToEdgeList */\
/*                              */\
/* IMPORTANT: a renderer MUST       */\
/* have the same height (inc.   */\
/* borders) whatever its index  */\
/* in the list !                */\
/********************************/\
.d-list {\
  position: relative;\
  /* needed for moving list items in editable mode */\
  padding: 0;\
  margin: 0 !important;\
  overflow-x: hidden;\
  overflow-y: hidden;\
}\
.d-list > *:last-child {\
  border-bottom-width: 0;\
  padding-bottom: 1px;\
  /* to compensate the fact that the bottom width is 0 instead of 1 */\
}\
.d-list > .d-selected {\
  color: #ffffff;\
  background-image: -webkit-gradient(linear, left top, left bottom, from(#048bf4), to(#005ce5));\
  background-image: linear-gradient(to bottom, #048bf4 0%, #005ce5 100%);\
}\
'; } );
