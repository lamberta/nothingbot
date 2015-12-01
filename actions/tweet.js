/* jshint esversion:6, node:true */
'use strict';

var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var readline = require('readline');
var Twit = require('twit');

/*
 * COMMAND-LINE ARGS
 */
var argv = require('yargs')
      .usage("Usage: $0 [options]")
      .alias('c', 'count').describe('c', 'Number of responses to generate').default('c', 1)
      .alias('n', 'ngram').describe('n', 'N-gram factor').default('n', 3)
      .boolean('i').alias('i', 'interactive').describe('i', 'Select from list of generated responses')
      .string('s').alias('s', 'status').describe('s', 'Post this status instead of generating one')
      .string('f').alias('f', 'file').describe('f', 'Post status from JSON file and re-write to disk')
      .string('p').alias('p', 'prepend').describe('p', 'Prepend string to generated text (and space)')
      .string('a').alias('a', 'append').describe('a', 'Append string to generated text (and space)')
      .boolean('T').alias('T', 'trend').describe('T', 'Append random trending hashtag to generated text')
      .help('h').alias('h', 'help')
      .argv;

/*
 * LOAD SETTINGS
 */
try {
  var SETTINGS = require(path.resolve(__dirname, '../settings.json'));
  if (!SETTINGS.hasOwnProperty('twitter')) {
    throw new ReferenceError("Twitter settings property doesn't exist");
  }
} catch (err) {
  console.error("Unable to load Twitter auth settings");
  process.exit(1);
}

const INTERACTIVE_FLAG = argv.interactive;
const MAX_LEN = 140; //it's twitter of course
//uses Yahoo's "Where on Earth" id
const places = {
  'all': '1', //world
  'us': '23424977'
};

var twit = new Twit(SETTINGS.twitter);

//since the string is going through the shell, need to escape special chars
function sh_escape (str) {
  return str.replace(/([()[#{*+.$^! \\|?])/g, '\\$1');
}

/**
 * @param {number?} opts.count = 1
 * @param {number?} opts.ngram = 3
 * @param {string?} opts.prepend
 * @param {string?} opts.append
 * @param {function(err, array[string])} callback
 */
function generateStatus (opts, callback) {
  if (typeof arguments[0] === 'function') { callback = arguments[0]; }
  let count = (typeof opts == 'object' && opts.count !== undefined) ? opts.count : 1;
  let ngram = (typeof opts == 'object' && opts.ngram !== undefined) ? opts.ngram : 3;
  let script = path.resolve(__dirname, '../generate-tweet/main.py');
  let corpus1 = path.resolve(__dirname, '../corpus/tweets/realDonaldTrump.txt');
  let corpus2 = path.resolve(__dirname, '../corpus/sartre-being-and-nothingness.txt');
  let cmd = `python ${script} -j -t ${corpus1} -f ${corpus2} -c ${count} -n ${ngram}`;

  if (opts.prepend) { cmd += ` -p ${sh_escape(opts.prepend)}`; }
  if (opts.append) { cmd += ` -a ${sh_escape(opts.append)}`; }

  console.log(`Loading corpus: ${path.basename(corpus1)}`);
  console.log(`Loading corpus: ${path.basename(corpus2)}`);

  child_process.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      callback(err);
    } else {
      var responses;
      try {
        responses = JSON.parse(stdout);
      } catch (err) {
        callback(new Error(`Unable to parse JSON from ${script}`));
      }
      if (!Array.isArray(responses)) {
        callback(new Error(`Did not get an array back from ${script}`));
      } else {
        callback(err, responses);
      }
    }
  });
}

/**
 * @param {string} opts.placeId --Uses Yahoo's "Where on Earth" id.
 * @param {boolean?} opts.hashtag = false --Convert all trending topics to hashtags
 * @param {function(err, array[string])} callback
 */
function getTrendingTopics (opts, callback) {
  twit.get('trends/place', {id: opts.placeId}, function (err, data, res) {
    let trends = [];
    for (let obj of data[0].trends) {
      //hail corporate
      if (!obj.promoted_content) {
        let name = obj.name;
        //hashtagify?
        if (opts.hashtag) {
          name = name.replace(/\s/g, ''); //remove spaces
          if (name[0] !== '#') { name = ('#' + name); } //prepend
        }
        trends.push(name);
      }
    }
    callback(err, trends);
  });
}

/**
 * @param {string} status
 * @param {function(err, data, response)} callback
 */
function postTweet (status, callback) {
  if (typeof status !== 'string' || status.length === 0) {
    console.error("Tweet must be a non-empty string, aborting.");
    process.exit(1);
  }
  if (status.length > MAX_LEN) {
    console.error(`Tweet is longer than ${MAX_LEN} chars (${argv.status.length}), aborting.`);
    process.exit(1);
  }

  twit.post('statuses/update', {status: status}, function (err, data, res) {
    if (callback) {
      callback(err, data, res);
    } else if (err) {
      throw err;
    }
  });
}

/**
 * @param {string} opts.file ---Path to JSON file of string array of statuses.
 * @param {function(err, data, res)} callback
 */
function readStatusFileAndPost (opts, callback) {
  let tweets;
  try {
    tweets = JSON.parse(fs.readFileSync(opts.file, 'utf8'));
  } catch (err) {
    console.error("Unable to load statuses file");
    console.error(err.message);
    process.exit(1);
  }

  if (!Array.isArray(tweets) || tweets.length === 0 || typeof tweets[0] !== 'string') {
    throw new TypeError("Invalid format for status file or empty");
  } else {
    //get status, append any command-line tags, check len
    let tweet = tweets.shift(); //remove from front of array
    if (opts.prepend) { tweet = sh_escape(opts.prepend + ' ' + tweet); }
    if (opts.append) { tweet = sh_escape(tweet + ' ' + opts.append); }

    if (tweet.length > MAX_LEN) {
      console.error(`Tweet is longer than ${MAX_LEN} chars (${tweet.length}), aborting.`);
      console.error(tweet);
      process.exit(1);
    }

    postTweet(tweet, function (err, data, res) {
      if (err) {
        console.error(`Error posting tweet: ${err.message}`);
        process.exit(1);
      }
      //write adjusted tweet array to disk (pretty-print)
      fs.writeFile(opts.file, JSON.stringify(tweets, null, 2), function (err) {
        if (err) {
          console.error(`Error saving file ${opts.file}: err.message`);
        }
        callback(err, data, res);
      });
    });
  }
}

/**
 * @param {array[string]} choices
 * @param {function(string)} callback
 */
function promptSelection (choices, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  //display menu choices
  for (let i = 0, len = choices.length; i < len; i++) {
    //menu starts at 1, pad with space
    var menu_item = '   ' + (i+1);
    menu_item = menu_item.substr(menu_item.length-2);
    console.log(`[${menu_item}] ${choices[i]}`);
  }

  rl.question("Make selection: ", function (selection) {
    rl.close();
    let i = parseInt(selection);
    if (!Number.isInteger(i) || (i-1) < 0 || i-1 >= choices.length) {
      console.error(`Invalid selection '${selection}', aborting.`);
      process.exit(1);
    } else {
      callback(choices[i-1]);
    }
  });
}

/**
 * Interactively post tweet, if necessary.
 */
function interactivePostTweet (err, strings) {
  if (err) throw err;

  if (INTERACTIVE_FLAG) {
    promptSelection(strings, function (status) {
      postTweet(status, onFinish);
    });
  } else {
    postTweet(strings[0], onFinish);
  }
}

/**
 * Tweet posted, display info and exit.
 * @param {error?} err
 * @param {object} data ---Twitter API 'tweet' object: https://dev.twitter.com/overview/api/tweets
 * @param {} response
 */
function onFinish (err, data, response) {
  if (err) throw err;
  console.log(`Posted tweet to ${data.user.name}'s timeline!`);
  console.log(data.text);
  console.log(`https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
  process.exit(0);
}

/*
 * MAIN
 */

//user-supplied or generate our own
if (argv.hasOwnProperty('status')) {
  postTweet(argv.status, onFinish);

} else {
  //parse command-line options
  let opts = {
    count: parseInt(argv.count),
    ngram: parseInt(argv.ngram),
    prepend: argv.prepend,
    append: argv.append,
    file: argv.file
  };
  //if interactive have at least 10 choices
  if (INTERACTIVE_FLAG && opts.count < 10) { opts.count = 10; }

  if (opts.file) {
    //read status from file and post
    readStatusFileAndPost(opts, onFinish);

  } else {
    console.log(`Generating ${opts.count} tweet${opts.count>1?'s':''}, n-gram factor ${opts.ngram} ...`);

    //query twitter first?
    if (argv.trend) {
      getTrendingTopics({placeId: places['us'], hashtag: true}, function (err, trends) {
        let trend = trends[Math.floor(Math.random() * trends.length)]; //random element
        opts.append = (opts.append) ? (opts.append + ' ' + trend) : trend;
        console.log(`Current trending topics: ${trends.join(', ')}`);
        generateStatus(opts, interactivePostTweet);
      });
    } else {
      generateStatus(opts, interactivePostTweet);
    }
  }
}
