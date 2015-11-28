/**
 * Scrape a Twitter search result page and output statuses in a CSV format.
 * Scraping is needed because of API history limits.
 */

'use strict';

var path = require('path');
var fs = require('fs');
var htmlparser = require('htmlparser2');
var select = require('soupselect').select;
var parsing = require('./parsing');

var FILES = [];

/*
 * COMMAND-LINE ARGS
 */
if (process.argv.length < 3) {
  console.error(`Usage: node ${path.basename(process.argv[1])} file1 [file2 ...]`);
  process.exit(1);
}

for (let i = 2, len = process.argv.length; i < len; i++) {
  FILES.push(process.argv[i]);
}

/*
 * OUTPUT FORMAT
 */
function printCSV (data) {
  let id = data.id_str;
  let date = data.date.toISOString();
  let text = JSON.stringify(data.text);
  console.log(`${id},${date},${text}`);
}

/*
 * PARSER
 */
var handler = new htmlparser.DefaultHandler(function (err, dom) {
  if (err) throw err;
  let tweetDivs = select(dom, 'div.original-tweet');

  for (let tweet of tweetDivs) {
    let tweetData = parsing.parseTweetDiv(tweet);
    printCSV(tweetData);
  }
});

/*
 * MAIN
 */
for (let file of FILES) {
  let contents = fs.readFileSync(file);
  let parser = new htmlparser.Parser(handler);
  parser.parseComplete(contents);
}
