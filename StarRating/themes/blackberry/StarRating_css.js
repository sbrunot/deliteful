define(function(){ return '\
.d-star-rating {\
  display: inline-block;\
}\
.d-star-rating input {\
  display: none;\
}\
.d-star-rating > div {\
  width: 20px;\
  height: 40px;\
  display: inline-block;\
  margin: 0px;\
  padding: 0px;\
  background-image: url("../../images/yellow-stars-40.png");\
}\
.d-star-rating[disabled] > div {\
  background-image: url("../../images/grey-stars-40.png");\
}\
.d-star-rating > div:first-child {\
  background-image: none;\
}\
.d-star-rating-editing > div {\
  opacity: 0.5;\
}\
.d-star-rating > div:nth-child(odd),\
.d-star-rating[dir=rtl] > div:nth-child(even),\
.d-star-rating.d-star-rating-editing > div.d-star-rating-value-marker ~ div:nth-child(odd),\
.d-star-rating[dir=rtl].d-star-rating-editing > div.d-star-rating-value-marker ~ div:nth-child(even) {\
  background-position: -20px 0px;\
}\
.d-star-rating[dir=rtl] > div:nth-child(odd),\
.d-star-rating.d-star-rating-editing > div.d-star-rating-value-marker ~ div:nth-child(even),\
.d-star-rating[dir=rtl].d-star-rating-editing > div.d-star-rating-value-marker ~ div:nth-child(odd) {\
  background-position: 0px 0px;\
}\
.d-star-rating > .d-star-rating-value-marker ~ div:nth-child(even),\
.d-star-rating[dir=rtl] > .d-star-rating-value-marker ~ div:nth-child(odd),\
.d-star-rating.d-star-rating-editing > div.d-star-rating-mouse-hovered ~ div:nth-child(even),\
.d-star-rating[dir=rtl].d-star-rating-editing > div.d-star-rating-mouse-hovered ~ div:nth-child(odd) {\
  background-position: -40px 0px;\
}\
.d-star-rating > .d-star-rating-value-marker ~ div:nth-child(odd),\
.d-star-rating[dir=rtl] > .d-star-rating-value-marker ~ div:nth-child(even),\
.d-star-rating.d-star-rating-editing > div.d-star-rating-mouse-hovered ~ div:nth-child(odd),\
.d-star-rating[dir=rtl].d-star-rating-editing > div.d-star-rating-mouse-hovered ~ div:nth-child(even) {\
  background-position: -60px 0px;\
}\
.d-star-rating.d-star-rating-no-half-value > div.d-star-rating-value-marker:nth-child(even) + div,\
.d-star-rating.d-star-rating-no-half-value > div.d-star-rating-mouse-hovered:nth-child(even) + div {\
  background-position: -20px 0px;\
}\
.d-star-rating[dir=rtl].d-star-rating-no-half-value > div.d-star-rating-value-marker:nth-child(even) + div,\
.d-star-rating[dir=rtl].d-star-rating-no-half-value > div.d-star-rating-mouse-hovered:nth-child(even) + div {\
  background-position: 0px 0px;\
}\
'; } );
