## returns a list of lists: sentences -> words

import os
import re
import codecs
from nltk.tokenize import sent_tokenize
from nltk.tokenize import TreebankWordTokenizer
from nltk.tokenize import TweetTokenizer

# sentences are an array of strings
# returns an array of arrays{string}
def tokenize (sentences, tokenizer):
    tokens = []
    for sentence in sentences:
        tokens.append(tokenizer.tokenize(sentence))
    return tokens

def tokenize_text (text):
    sentences = sent_tokenize(text) #defaults to PunktSentenceTokenizer
    word_tokenizer = TreebankWordTokenizer()
    return tokenize(sentences, word_tokenizer)

def tokenize_file (filename):
    if not os.path.isfile(filename):
        raise IOError("File doesn't exist: %s" % filename)
    with codecs.open(filename,'r',encoding='utf8') as f:
        contents = f.read()
    return tokenize_text(contents)
    
# TweetTokenizer(preserve_case=True, reduce_len=False, strip_handles=False)
# reduce_len will squeeze many repeating chars down to 3
# strip_handles removes usernames
def tokenize_tweets (filename, preserve_case=True, reduce_len=False, strip_handles=False):
    if not os.path.isfile(filename):
        raise IOError("File doesn't exist: %s" % filename)
    with open(filename) as f:
        sentences = f.readlines()
    word_tokenizer = TweetTokenizer(preserve_case, reduce_len, strip_handles)
    return tokenize(sentences, word_tokenizer)
