define(function () {
	/* jshint multistr: true */
	/* jshint -W015 */
	/* jshint -W033 */
	return "\
.d-star-rating.d-star-rating-hovered {\
  opacity: 0.5;\
}\
.d-star-rating {\
  /* Do not modify the display style */\
  display: inline-block;\
}\
.d-star-rating-zero {\
  /* Do not modify the display style */\
  display: inline-block;\
  overflow: hidden;\
  height: 40px;\
  width: 20px;\
}\
.d-star-rating-zero.d-hidden {\
  width: 0px;\
}\
.d-star-rating-star-icon {\
  /* Do not modify the display style */\
  display: inline-block;\
  overflow: hidden;\
  font-size: 40px;\
  line-height: 40px;\
  height: 40px;\
  width: 20px;\
}\
.d-star-rating-star-icon:before {\
  width: 80px;\
  display: inline-block;\
  text-align: center;\
  color: #000000;\
  content: url(\"../../images/yellow-stars-40.png\");\
}\
.d-star-rating-disabled .d-star-rating-star-icon:before {\
  width: 80px;\
  display: inline-block;\
  text-align: center;\
  color: #808080;\
  content: url(\"../../images/grey-stars-40.png\");\
}\
.d-star-rating-start.d-star-rating-empty:before {\
  margin-left: -40px;\
}\
.d-star-rating-end.d-star-rating-empty:before {\
  margin-left: -60px;\
}\
.d-star-rating-end.d-star-rating-full:before {\
  margin-left: -20px;\
}";
});
