# -*- coding: utf-8 -*-
from __future__ import print_function
import sys
import getopt
import json
from tokenize import tokenize_file
from tokenize import tokenize_tweets
from response import build_tweets

RETURN_COUNT = 1
RETURN_JSON = False
NGRAM_LEN = 3
CORPUS_TEXT_FILES = []
CORPUS_TWEET_FILES = []

def print_usage (header=None):
    if header:
        print(header, file=sys.stderr)
    print("Usage: python %s [options]" % sys.argv[0], file=sys.stderr)
    print(" -c=n    Number of responses to return (default: %i)" % RETURN_COUNT, file=sys.stderr)
    print(" -n=n    Use n-grams of length n (default: %i)" % NGRAM_LEN, file=sys.stderr)
    print(" -f=file Text file corpus, to be split on sentences", file=sys.stderr)
    print(" -t=file Text file of tweets, one per line", file=sys.stderr)
    print(" -j      Output response(s) in a JSON array", file=sys.stderr)
    print(" -h", file=sys.stderr)


try:
    opts, args = getopt.getopt(sys.argv[1:], 'n:c:f:t:jh')
except getopt.GetoptError:
    print_usage("Unrecognized option!")
    sys.exit(1)

for opt, arg in opts:
    if opt == '-n':
        NGRAM_LEN = int(arg)
    elif opt == '-c':
        RETURN_COUNT = int(arg)
    elif opt == '-f':
        CORPUS_TEXT_FILES.append(arg)
    elif opt == '-t':
        CORPUS_TWEET_FILES.append(arg)
    elif opt == '-j':
        RETURN_JSON = True
    elif opt == '-h':
        print_usage()
        sys.exit(0)


def print_output (responses):
    if RETURN_JSON:
        #ensure_ascii=True -non-ascii chars are escaped \uXXXX
        print(json.dumps(responses, indent=2), file=sys.stdout)
    else:
        for res in responses:
            print(res, file=sys.stdout)
    if len(responses) < RETURN_COUNT:
        print("Warning: Only generated %d of %d responses" % (len(responses), RETURN_COUNT), file=sys.stderr)


if __name__ == '__main__':
    corpus_tokens = []
    for filename in CORPUS_TEXT_FILES:
        corpus_tokens += tokenize_file(filename)
    for filename in CORPUS_TWEET_FILES:
        corpus_tokens += tokenize_tweets(filename, reduce_len=True, strip_handles=False)

    if len(corpus_tokens) == 0:
        print("No corpus data found!", file=sys.stderr)
        print_usage()
        sys.exit(1)

    responses = build_tweets(corpus_tokens, RETURN_COUNT, NGRAM_LEN)
    print_output(responses)
