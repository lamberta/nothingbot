'use strict';

var select = require('soupselect').select;


exports.parseTweetDiv = function (div) {
  let text = getStatusText(select(div, 'p.TweetTextSize'));
  let timestamp = select(div, '.time span._timestamp');
  let time_ms = parseInt(timestamp[0].attribs['data-time-ms']);

  // let tweetinfo = {
  //   id_str: tweet.attribs['data-tweet-id'],
  //   hasMedia: tweet.attribs['data-has-native-media'],
  //   hasCards: tweet.attribs['data-has-cards'],
  //   cardType: tweet.attribs['data-card-type'],
  //   date: new Date(time_ms).toISOString(),
  //   text: getStatusText(select(tweet, 'p.TweetTextSize'))
  //   //retweets: getStatusText(select(tweet, 'div.ProfileTweet-action--retweet .IconTextContainer .ProfileTweet-actionCountForPresentation'))
  // };
  
  return {
    id_str: div.attribs['data-tweet-id'],
    date: new Date(time_ms),
    text: exports.unescape(text)
  };
};


function getStatusText (elem) {
  var text = '';

  if (Array.isArray(elem)) {
    for (let el of elem) {
      text += getStatusText(el);
    }
  } else if (elem.type === 'text') {
    text += elem.data;

  } else if (elem.type === 'tag' &&
             elem.name === 'a' &&
             elem.attribs['data-expanded-url']) {
    //ignore the funky link shortened rendered text
    text += elem.attribs['data-expanded-url'];
    
  } else if (Array.isArray(elem.children)) {
    text += getStatusText(elem.children);
  }

  return text;
}


/**
 * Escape special characters in the given string of html.
 * Using escape maps that Underscore uses.
 * Additional: http://www.w3schools.com/charsets/ref_utf_punctuation.asp
 * @param  {String} html
 * @return {String}
 */
exports.escape = function (html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Unescape special characters in the given string of html.
 * @param  {String} html
 * @return {String}
 */
exports.unescape = function (html) {
  return String(html)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x60;/g, "`")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
};
