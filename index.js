'use strict';

var postcss = require('postcss');
var objectAssign = require('object-assign');

// excluding regex trick: http://www.rexegg.com/regex-best-trick.html
// Not anything inside double quotes
// Not anything inside single quotes
// Not anything inside url()
// Any digit followed by px
// !singlequotes|!doublequotes|!url()|pixelunit
var pxRegex = /"[^"]+"|'[^']+'|url\([^\)]+\)|(\d*\.?\d+)px/ig;

var defaults = {
  viewportSize: 1000,
  unitPrecision: 5,
  viewportUnit: 'vw',
  selectorBlackList: [],
  minPixelValue: 1,
  mediaQueryParams: []
};

module.exports = postcss.plugin('postcss-px-to-viewport', function (options) {

  var opts = objectAssign({}, defaults, options);
  var pxReplace = createPxReplace(opts.viewportSize, opts.minPixelValue, opts.unitPrecision, opts.viewportUnit);

  return function (css) {

    css.walkRules(function (rule) {

      // console.dir(rule.parent);
      if (typeof rule.parent.params !== 'undefined') {
        var mediaQueryParam = opts.mediaQueryParams[inArrayIndex(rule.parent.params, opts.mediaQueryParams, 'mediaRule')];

        if (typeof mediaQueryParam !== 'undefined') {
          if (mediaQueryParam.viewportSize <= 0) return;
          var mobPxReplace = createPxReplace(mediaQueryParam.viewportSize, mediaQueryParam.minPixelValue || opts.minPixelValue, mediaQueryParam.unitPrecision || opts.unitPrecision, mediaQueryParam.viewportUnit || mediaQueryParam.viewportUnit);
          rule.walkDecls(function (decl, i) {
            // This should be the fastest test and will remove most declarations
            if (decl.value.indexOf('px') === -1) return;

            decl.value = decl.value.replace(pxRegex, mobPxReplace);
          });
        }
        else {
          rule.walkDecls(function (decl, i) {
            // This should be the fastest test and will remove most declarations
            if (decl.value.indexOf('px') === -1) return;

            if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

            decl.value = decl.value.replace(pxRegex, pxReplace);
          });
        }
      }
      else {
        rule.walkDecls(function (decl, i) {
          // This should be the fastest test and will remove most declarations
          if (decl.value.indexOf('px') === -1) return;

          if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

          decl.value = decl.value.replace(pxRegex, pxReplace);
        });
      }

    });

  };
});

function inArrayIndex(str, arr, key) {
  str = str.replace(/\s/g, '');
  var index = -1;
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    if (str.indexOf(item[key].replace(/\s/g, '')) !== -1) index = i;
  }
  return index;
}

function createPxReplace(viewportSize, minPixelValue, unitPrecision, viewportUnit) {
  return function (m, $1) {
    if (!$1) return m;
    var pixels = parseFloat($1);
    if (pixels <= minPixelValue) return m;
    return toFixed((pixels / viewportSize * 100), unitPrecision) + viewportUnit;
  };
}

function toFixed(number, precision) {
  var multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10 / multiplier).toFixed(precision);
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== 'string') return;
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1;
    return selector.match(regex);
  });
}
